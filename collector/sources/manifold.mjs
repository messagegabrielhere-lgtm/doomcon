// Manifold: how much is being staked on AI questions in the last 24 hours.
//
// Play money, and that is a feature here rather than a flaw. Manifold has no
// CFTC perimeter, so it carries hundreds of live questions on capability
// milestones that no real-money venue will list — the long tail of AI belief.
// It is a breadth signal; Polymarket and Kalshi are the depth signals. They
// answer different questions and all three sit in the markets pillar on
// purpose.
//
// Verified 2026-09-23: 251 markets screened across the six fixed terms -> 234
// live binary AI markets, 16,093 MANA traded in 24h.

// The AI question matcher is defined once, in polymarket.mjs, and imported
// here. It used to be a byte-identical copy in this file, justified in a
// comment on the grounds that each adapter should own its screening rule.
// That reasoning does not survive scrutiny: the thing that has to be
// per-adapter is HOW the matcher is applied, not the token list itself, and
// three copies of one regex is three places to fix a false positive. The
// application is documented at the call site below.
import { AI_QUESTION } from './polymarket.mjs';

const ENDPOINT = 'https://api.manifold.markets/v0/search-markets';

// Hard-coded, fixed basket definition.
//
// DELIBERATELY NOT EXPANDED, and the asymmetry with polymarket.mjs — which
// went from six terms to twelve in the same revision — is the point.
//
// This adapter's scalar is a SUM. A sum moves with basket size, so adding a
// search term raises the reading with no change in the world whatsoever. It
// was measured rather than assumed: adding the eight terms polymarket.mjs now
// carries takes this basket from 234 markets to 496 — more than double — while
// the 24-hour volume they bring is a rounding error, because the markets the
// extra terms reach are the dormant tail. The index would have stepped up for
// a configuration change.
//
// polymarket.mjs can expand safely because its scalar is a weighted MEAN,
// which is basket-size robust. This one cannot. docs/MARKETS.md carries the
// full argument, and it is the reason these two term lists must never be
// "tidied up" into one shared constant.
const TERMS = [
  'AGI',
  'artificial general intelligence',
  'superintelligence',
  'AI capabilities',
  'OpenAI',
  'Anthropic',
];

const MIN_MARKETS = 20;

// Display list size. Small on purpose: this is a sidebar, not a table.
const TOP_MARKETS = 8;

// WHAT THE SCALAR MEANS — read this before changing it.
//
// value = total MANA traded in the last 24 hours, summed across every live
//         binary AI market Manifold surfaces for the fixed terms above.
//
// Plain English: "how much play money changed hands on AI questions today."
//
// Why volume and not a price. Same reason as Polymarket: a mean probability
// across a heterogeneous basket is a probability-of-the-thing number, which
// this index is forbidden to publish, and it is not even well defined when the
// basket contains date ladders ("AGI before 2027 / 2028 / 2030" — all three
// are live right now, from the same creator — the mean of a ladder tracks how
// many rungs someone happened to create).
// Volume has none of those pathologies: it is additive, it has an unambiguous
// direction, and it is exactly the thing the word "activity" denotes.
//
// Why 24h and not lifetime volume. Lifetime volume only ever goes up; it is a
// cumulative total, not a tempo. The 24-hour figure is the flow. (Lifetime
// volume IS used, further down, to order the display list — a different job,
// where monotonicity is the desirable property rather than the disqualifying
// one.)
//
// Known property, stated rather than hidden: this sums over the basket, so it
// moves with basket size as well as with trading. markets_in_basket is in meta
// on every reading precisely so that confound is visible and auditable. Do not
// "improve" this into a per-market mean, and do not add search terms, without
// re-freezing the reference distribution — see the note on TERMS above.
//
// Direction: more money moving on AI questions -> higher value.

/** Manifold hands out epoch milliseconds; the rest of this repo speaks ISO. */
function isoFromMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default {
  id: 'manifold',
  pillar: 'markets',
  label: 'Manifold AI market turnover (24h)',

  async collect(fetchJson) {
    // Keyed by market id. The same question is listed by several creators and
    // the search returns near-duplicates across terms; both would inflate the
    // sum if not deduped.
    const basket = new Map();
    let screened = 0;
    const rejected = Object.create(null);
    const reject = (reason) => {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
    };

    // Captured once so every market in one run is judged against the same
    // instant. Re-reading the clock inside the loop would let a market fall on
    // one side of the close-time test and its duplicate on the other.
    const nowMs = Date.now();

    for (const term of TERMS) {
      const qs = new URLSearchParams({
        term,
        filter: 'open',
        contractType: 'BINARY',
        sort: 'score',
        limit: '50',
      });

      const rows = await fetchJson(`${ENDPOINT}?${qs}`);
      // This endpoint returns a bare array, not an envelope object.
      if (!Array.isArray(rows)) {
        throw new Error(
          `manifold: term "${term}" returned ${typeof rows}, expected an array of markets`
        );
      }

      for (const m of rows) {
        screened++;

        // filter=open is advisory; re-check rather than trust it.
        if (m?.isResolved !== false) {
          reject('resolved');
          continue;
        }
        if (m?.outcomeType !== 'BINARY') {
          reject('not_binary');
          continue;
        }

        // Manifold runs two currencies: MANA (play) and CASH (sweepstakes).
        // Summing them would be adding two different units and calling the
        // result a number. MANA is the deeper of the two, so it is the series.
        if (m?.token !== 'MANA') {
          reject('not_mana');
          continue;
        }

        if (typeof m.probability !== 'number') {
          reject('no_probability');
          continue;
        }
        if (typeof m.id !== 'string') {
          reject('no_id');
          continue;
        }

        // `filter=open` is about the resolution state, not the clock, and a
        // market past its close time is not taking new trades even though it
        // is unresolved. Checked rather than assumed. It found nothing on
        // 2026-09-23 — closed_in_past sat at 0 across all 251 rows — which is
        // why the count is published: a guard nobody can see the output of is
        // indistinguishable from a guard that does not work.
        if (typeof m.closeTime === 'number' && m.closeTime < nowMs) {
          reject('closed_in_past');
          continue;
        }

        // HARD GATE. Manifold's search is markedly better than Polymarket's,
        // but it still reaches into descriptions, so the same local
        // question-text gate applies. Applied as a filter here — unlike in
        // kalshi.mjs, where the retrieval mechanism is a curated editorial tag
        // and the regex is only advisory.
        if (!AI_QUESTION.test(m.question ?? '')) {
          reject('off_topic');
          continue;
        }

        // Absent 24h volume means Manifold reported nothing for this market,
        // which is not the same as "nothing traded". Skipped, not zeroed.
        const v24 = m.volume24Hours;
        if (typeof v24 !== 'number' || !Number.isFinite(v24) || v24 < 0) {
          reject('no_24h_volume');
          continue;
        }

        // Lifetime volume. Not part of the scalar — it orders the display
        // list only — so a market missing it is kept, at 0, rather than
        // dropped. That zero can never reach the index.
        const lifetime = typeof m.volume === 'number' && Number.isFinite(m.volume) ? m.volume : 0;

        basket.set(m.id, {
          id: m.id,
          question: m.question,
          slug: m.slug,
          // Manifold is the only one of the three venues that returns a
          // canonical web URL, so it is used rather than reconstructed.
          url: typeof m.url === 'string' ? m.url : null,
          volume_24h: v24,
          volume_lifetime: lifetime,
          probability: m.probability,
          close_time: isoFromMs(m.closeTime),
        });
      }
    }

    if (basket.size < MIN_MARKETS) {
      throw new Error(
        `manifold: only ${basket.size} live AI markets passed screening of ${screened} ` +
        `(need ${MIN_MARKETS}); basket too thin to sum`
      );
    }

    const members = [...basket.values()];
    const value = members.reduce((s, m) => s + m.volume_24h, 0);

    if (!Number.isFinite(value)) {
      throw new Error(`manifold: 24h volume sum resolved to non-finite ${value}`);
    }

    const topContributors = members
      .slice()
      .sort((a, b) => b.volume_24h - a.volume_24h || a.id.localeCompare(b.id))
      .slice(0, 8)
      .map((m) => ({ question: m.question, slug: m.slug, volume_24h: m.volume_24h }));

    // Display list: what the site shows next to the news.
    //
    // Ranked by LIFETIME volume, not by the 24h volume that drives the scalar.
    // The scalar wants today's flow; the sidebar wants to not churn. Lifetime
    // volume is near-monotonic, so the same eight questions persist run after
    // run with their odds updating underneath, whereas the 24h ranking is
    // almost entirely different every few hours. The id tie-break makes the
    // order total, so two runs over identical data emit identical output
    // (CONTRACT §1.4).
    const topMarkets = members
      .slice()
      .sort((a, b) => b.volume_lifetime - a.volume_lifetime || a.id.localeCompare(b.id))
      .slice(0, TOP_MARKETS)
      .map((m) => ({
        question: m.question,
        url: m.url,
        probability: Math.round(m.probability * 1000) / 1000,
        // Lifetime MANA, matching the ranking. NOT the 24h figure — a display
        // row showing a different volume from the one it was ranked by is a
        // bug report waiting to be filed.
        volume: m.volume_lifetime,
        // Three venues, three currencies. Named per row so a consumer merging
        // the lists cannot add MANA to dollars. MANA is play money and the
        // site must say so wherever this is rendered.
        volume_unit: 'mana',
        close_time: m.close_time,
        source: 'manifold',
      }));

    return {
      value,
      unit: 'mana/24h',
      observed_at: new Date().toISOString(),
      meta: {
        terms: TERMS,
        markets_in_basket: basket.size,
        markets_screened: screened,
        rejected,
        rejected_off_topic: rejected.off_topic ?? 0,
        total_volume_lifetime_mana: members.reduce((s, m) => s + m.volume_lifetime, 0),
        mean_probability: members.reduce((s, m) => s + m.probability, 0) / members.length,
        top_contributors: topContributors,
        top_markets: topMarkets,
        direction: 'higher = more play-money volume on live AI questions',
        definition: 'sum of 24h MANA volume across live binary AI markets matching fixed terms',
      },
    };
  },
};
