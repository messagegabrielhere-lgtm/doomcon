// Polymarket (Gamma API): how hard real money is revising its view of AI.
//
// Verified 2026-09-23 against the live API: 3,993 markets screened across 12
// search terms -> 66 live, independent AI questions carrying $7,195,010 of
// volume; volume-weighted mean |1d move| = 0.031142 probability points.

const ENDPOINT = 'https://gamma-api.polymarket.com/public-search';

// ───────────────────────────────────────────────────────────────────────────
// SHARED AI MATCHER — this is the one definition, and the other two markets
// adapters import it from here.
//
// It previously existed as a byte-identical copy in manifold.mjs with a
// comment justifying the duplication on the grounds that each adapter should
// own its screening rule. That was the wrong call: three copies of one regex
// is three places to fix a false positive and two of them will be missed. The
// thing that actually has to be per-adapter is HOW the matcher is used, and
// that genuinely does differ — polymarket.mjs and manifold.mjs run it as a
// hard filter because their retrieval is a fuzzy full-text search, while
// kalshi.mjs runs it as an advisory count because its retrieval is Kalshi's
// own curated `AI` tag and a regex has no business overruling a human
// taxonomy. Each adapter documents its own choice at the call site.
//
// It lives here rather than in a new shared file because collect.mjs discovers
// adapters by directory listing; a helper module would have to be added to
// collector/sources/ under the `_` convention, and this agent does not own
// that path.
//
// Word boundaries are mandatory. A bare "ai" substring matches said, chair,
// Dubai, Taiwan, campaign. `\b` on both ends makes all of those misses while
// still matching "AI", "A.I." and "AI-safety".
// ───────────────────────────────────────────────────────────────────────────
export const AI_QUESTION =
  /\b(a\.?i\.?|agi|llm|gpt|openai|anthropic|deepmind|deepseek|mistral|chatgpt|claude|gemini|grok|superintelligence|artificial\s+(general\s+)?intelligence)\b/i;

// ───────────────────────────────────────────────────────────────────────────
// matchAiQuestion — the gate all three markets adapters use (2026-10-08).
//
// AI_QUESTION above is kept, unchanged, as the CORE vocabulary. On its own it
// failed in both directions:
//
//   * too narrow: "xAI" has no word boundary before the A, so every xAI market
//     the 'xAI' search term retrieved was rejected unless it also said "Grok";
//     "large language model", "machine learning", "Sam Altman" did not match;
//   * too broad: Gemini is also a crypto exchange (GEMI) and a zodiac sign,
//     Claude is also a first name (Claude Giroux), Mistral is a wind, "Ai" is
//     also Ai Weiwei — and a "Will Powell say 'AI' at the presser?" mention
//     market is a bet on a speech, not on AI.
//
// So the gate is now three explicit layers, in this order:
//
//   1. ALLOW-LIST of event-slug prefixes / tickers curated by hand. A member
//      passes regardless of its wording (but still faces every other screen —
//      tradeable, binary, priced, traded).
//   2. EXCLUSIONS. A mention market is rejected outright. An ambiguous token
//      (gemini, claude, mistral, grok, ai, llama, sora…) scores nothing when
//      its exclusion context is present in the same text.
//   3. KEYWORD SCORE. Strong tokens score 2, weak tokens 1; pass at >= 2. Every
//      token AI_QUESTION matches is strong or ambiguous-strong, so anything the
//      old regex passed still passes unless an exclusion fires.
//
// The result carries which layer decided and which tokens hit, so the reject
// tallies in meta stay auditable. Units and scalars are unchanged; only basket
// membership is affected, and no markets source has a frozen reference yet
// (see docs/REFERENCE-VERSIONING.md before changing this once one does).
// ───────────────────────────────────────────────────────────────────────────

// Prefixes of Polymarket event slugs (and Manifold slugs) that are AI questions
// by construction. Prefix, not exact slug, because ladders share a stem
// ("anthropic-ipo-by" is seven dated legs).
export const AI_SLUG_ALLOW = Object.freeze([
  'anthropic-ipo',
  'will-anthropics-valuation',
  'openai-ipo',
  'openai-announces-agi',
  'which-company-has-best-ai-model',
  'which-company-has-the-best-ai-model',
  'best-ai-model',
  'top-ai-model',
  'xai-',
  'grok-',
  'gpt-5',
  'gpt-6',
  'gemini-3',
  'claude-5',
  'deepseek-',
  'agi-',
]);

const AMBIG = true;
// [name, regex, weight, ambiguous?, exclusion-context regex]
const AI_TERMS = [
  ['agi', /\bagi\b/i, 2],
  ['llm', /\bllms?\b/i, 2],
  ['gpt', /\bgpt(?:-?\d+(?:\.\d+)?[a-z]?)?\b/i, 2],
  ['openai', /\bopen\s?ai\b/i, 2],
  ['anthropic', /\banthropic\b/i, 2, AMBIG, /\banthropic\s+principle\b/i],
  ['deepmind', /\bdeepmind\b/i, 2],
  ['deepseek', /\bdeepseek\b/i, 2],
  ['chatgpt', /\bchatgpt\b/i, 2],
  ['superintelligence', /\bsuper\s?intelligen(?:ce|t)\b/i, 2],
  ['artificial-intelligence', /\bartificial\s+(?:general\s+)?intelligence\b/i, 2],
  ['large-language-model', /\blarge\s+language\s+models?\b/i, 2],
  ['machine-learning', /\bmachine\s+learning\b/i, 2],
  ['xai', /(?:^|[^a-z0-9])xai\b/i, 2],
  ['ai-lab-ceo', /\b(?:sam\s+altman|dario\s+amodei|demis\s+hassabis|ilya\s+sutskever|mustafa\s+suleyman)\b/i, 2],
  ['ai', /\b(?:a\.i\.?|ai)\b/i, 2, AMBIG, /\bai\s+weiwei\b|\bai\s+(?:yazawa|uehara|otsuka)\b/i],
  ['gemini', /\bgemini\b/i, 2, AMBIG,
    /\bgemini\b[^.?!]{0,40}\b(?:exchange|trust|space\s+station|winklevoss|crypto|bitcoin|stablecoin|zodiac|horoscope|capsule|astronaut|spacecraft)\b|\b(?:winklevoss|crypto|bitcoin|zodiac|horoscope|nasa)\b[^.?!]{0,40}\bgemini\b|\bGEMI\b/i],
  ['claude', /\bclaude\b/i, 2, AMBIG,
    /\bclaude\s+(?:giroux|julien|lemieux|monet|debussy|makelele|puel|van\s+damme|rains|nobs)\b|\bjean[-\s]claude\b/i],
  ['grok', /\bgrok\b/i, 2, AMBIG, /\bgrok(?:king)?\s+(?:fest|festival)\b/i],
  ['mistral', /\bmistral\b/i, 2, AMBIG, /\bmistral\s+(?:wind|class|amphibious|ship|helicopter\s+carrier)\b/i],
  ['llama', /\bllama\s?\d/i, 2],
  ['sora', /\bsora\b/i, 1, AMBIG, /\bsora\s+(?:aoi|no\s+oto)\b/i],
  ['copilot', /\bcopilot\b/i, 1],
  ['ai-context', /\b(?:chatbot|lmarena|chatbot\s+arena|frontier\s+model|neural\s+net(?:work)?s?|model\s+release|benchmark|humanity'?s\s+last\s+exam|swe-?bench|turing\s+test)\b/i, 1],
];

// "Will X say 'AI' / mention AI during …" — bets on a speech's word count. The
// quote characters or the verb + "during|at|in" frame is what marks them.
const MENTION_MARKET =
  /\b(?:say|says|said|mention|mentions|mentioned|tweet|tweets|post|posts)\b[^?]{0,30}["“”'‘’][^"“”'‘’]{1,40}["“”'‘’]|\bhow\s+many\s+times\b[^?]{0,60}\b(?:say|mention)/i;

export const AI_MATCH_THRESHOLD = 2;

/**
 * Decide whether a market question is about AI.
 * @param {string} text            the question (title) text
 * @param {object} [ids]           { slug, eventSlug, ticker } — any may be absent
 * @returns {{ match:boolean, via:'allow'|'score'|'excluded'|'below_threshold', score:number, hits:string[], excluded:string[] }}
 */
export function matchAiQuestion(text, ids = {}) {
  const t = String(text ?? '');
  const keys = [ids.eventSlug, ids.slug, ids.ticker].filter((k) => typeof k === 'string' && k.length > 0).map((k) => k.toLowerCase());
  if (keys.some((k) => AI_SLUG_ALLOW.some((p) => k.startsWith(p)))) {
    return { match: true, via: 'allow', score: AI_MATCH_THRESHOLD, hits: [], excluded: [] };
  }
  if (MENTION_MARKET.test(t)) {
    return { match: false, via: 'excluded', score: 0, hits: [], excluded: ['mention_market'] };
  }
  let score = 0;
  const hits = [];
  const excluded = [];
  for (const [name, re, w, ambiguous, exclude] of AI_TERMS) {
    if (!re.test(t)) continue;
    if (ambiguous && exclude && exclude.test(t)) { excluded.push(name); continue; }
    score += w;
    hits.push(name);
  }
  if (score >= AI_MATCH_THRESHOLD) return { match: true, via: 'score', score, hits, excluded };
  return { match: false, via: excluded.length && hits.length === 0 ? 'excluded' : 'below_threshold', score, hits, excluded };
}

// Hard-coded search terms. Fixed on purpose: a basket whose selection rule
// changes is not a time series.
//
// Expanded 2026-09-23 from six terms to twelve, and this is the moment to do
// it — data/reference.json carries no frozen distribution for any markets
// source yet, so the pillar reads "awaiting baseline" and there is no history
// to invalidate. Once a markets baseline is frozen this list must not move
// again without a versioned re-freeze.
//
// Measured contribution of each addition (unique markets it alone brought in,
// after the full screen below): DeepSeek +9, Google DeepMind +13, xAI +15,
// AI regulation +7, AI safety +3, ChatGPT +19. Terms that were tested and
// REJECTED because they contributed zero new markets: "Nvidia AI", "Llama",
// "Mistral", "AI company". They are not listed here, so the cost of the test
// is paid once rather than on every run.
//
// This expansion is safe for this adapter specifically because its scalar is a
// weighted MEAN, which is robust to basket size. The same expansion is
// deliberately NOT applied to manifold.mjs, whose scalar is a SUM — see the
// note there. docs/MARKETS.md explains the asymmetry.
const TERMS = [
  'AGI',
  'artificial general intelligence',
  'superintelligence',
  'AI model',
  'AI safety',
  'AI regulation',
  'OpenAI',
  'Anthropic',
  'Google DeepMind',
  'xAI',
  'DeepSeek',
  'ChatGPT',
];

// Floor on basket size. Below this the weighted mean is a handful of opinions.
const MIN_EVENTS = 20;

// Display list size. Small on purpose: this is a sidebar, not a table.
const TOP_MARKETS = 8;

// WHAT THE SCALAR MEANS — read this before changing it.
//
// value = volume-weighted mean of |1-day price change| across live, binary,
//         independent AI QUESTIONS on Polymarket, in probability points.
//
// Plain English: "the average AI question on Polymarket moved this far
// yesterday, weighting questions by how much money trades on them." 0.031
// means the typical AI market repriced by 3.1 cents on the dollar.
//
// Why a MOVE and not a LEVEL. The obvious scalar is the mean YES price across
// AGI markets, and it is wrong twice over. First, this index measures activity
// tempo and is forbidden from measuring probability of harm — a mean YES price
// IS a probability of the thing, the precise number every judgment-scored
// competitor ships and then has to explain away. Second, it does not survive
// contact with the data: see the negRisk and ladder notes below.
//
// Why ABSOLUTE. Direction of a YES price is not comparable across questions —
// YES means "AGI arrived" in one market and "the lab got sued" in another. The
// magnitude of the revision is comparable across all of them, and it is the
// thing we actually claim to measure.
//
// Why VOLUME-WEIGHTED. A market with $1M behind it moving 3 cents is news; a
// $200 market moving 30 cents is one bored trader. Measured on the live
// basket, the largest single question carries 14.6% of the weight.
//
// Why ONE VOTE PER EVENT. Added 2026-09-23, and it is the substantive change
// in this revision. Excluding negRisk legs was not enough: Polymarket also
// slices a single question into NON-negRisk ladders, and they are the highest
// volume AI markets on the venue. `anthropic-ipo-by` is seven markets — "by
// Sep 30", "by Oct 15", "by Oct 31" … — and
// `will-anthropics-valuation-hit-by-december-31` is a stack of price
// thresholds. Those legs are not independent questions; they are one question
// asked seven times, and counting them seven times let a single storyline
// occupy most of the basket. So the basket is now one member per EVENT, the
// deepest-traded leg of it, which is bucket-safe in exactly the way the
// negRisk exclusion is: adding a rung to a ladder no longer changes anything.
//
// Direction: markets revising their AI views harder -> higher value.

// TRAP, confirmed on live data: `outcomes` and `outcomePrices` are JSON-ENCODED
// STRINGS inside the JSON, not arrays. `outcomePrices` arrives as the literal
// characters ["0.175", "0.825"] and must be parsed a second time — and the
// prices inside are strings too.
function parseEncodedArray(raw, field, id) {
  if (typeof raw !== 'string') {
    throw new Error(`polymarket: ${field} on market ${id} was ${typeof raw}, expected a JSON-encoded string`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`polymarket: ${field} on market ${id} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`polymarket: ${field} on market ${id} decoded to ${typeof parsed}, expected an array`);
  }
  return parsed;
}

function isTradeable(m) {
  return m?.closed === false && m?.active === true && m?.acceptingOrders === true;
}

/** Canonical web URL. Verified 2026-09-23: /event/<slug> answers HTTP 200,
 *  while /market/<slug> 307-redirects, so the event form is the one to emit. */
function eventUrl(slug) {
  return `https://polymarket.com/event/${slug}`;
}

export default {
  id: 'polymarket',
  pillar: 'markets',
  label: 'Polymarket AI repricing',

  async collect(fetchJson) {
    // Keyed by EVENT slug — one question, one vote. The same event comes back
    // under several terms and its legs come back together, and both would
    // silently re-weight the basket.
    const basket = new Map();
    let screened = 0;
    let passedScreen = 0;
    let allowListed = 0;
    const rejected = Object.create(null);
    const reject = (reason) => {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
    };

    for (const term of TERMS) {
      const qs = new URLSearchParams({
        q: term,
        limit_per_type: '40',
        // Without this the search happily returns markets that resolved in 2024.
        events_status: 'active',
      });

      const body = await fetchJson(`${ENDPOINT}?${qs}`);
      const events = body?.events;
      if (!Array.isArray(events)) {
        throw new Error(
          `polymarket: term "${term}" returned no events array (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
        );
      }

      for (const event of events) {
        const eventKey = event?.slug ?? event?.id;
        if (eventKey === undefined || eventKey === null) {
          reject('event_without_slug');
          continue;
        }

        for (const m of event?.markets ?? []) {
          screened++;
          if (!isTradeable(m)) {
            reject('not_tradeable');
            continue;
          }

          // negRisk marks a market that is one leg of a mutually-exclusive set
          // inside a single event — "Which company has the best AI model" is 32
          // of them, and their YES prices sum to 1 by construction. Averaging a
          // level across those measures HOW MANY BUCKETS EXIST, not anything
          // about AI: add a 33rd contender and the mean drops, with no news.
          // The one-vote-per-event rule below would already neutralise most of
          // this, but the exclusion stays explicit: a negRisk leg's price is a
          // SHARE of a partition rather than a probability of a fact, so even
          // its deepest leg is the wrong thing to put in the basket.
          if (m.negRisk === true) {
            reject('neg_risk');
            continue;
          }

          const id = m.conditionId ?? m.id;
          const outcomes = parseEncodedArray(m.outcomes, 'outcomes', id);
          const prices = parseEncodedArray(m.outcomePrices, 'outcomePrices', id);

          // Binary Yes/No only. Scalar and multi-outcome markets do not have a
          // single comparable price.
          if (outcomes.length !== 2 || prices.length !== 2) {
            reject('not_binary');
            continue;
          }
          const lower = outcomes.map((o) => String(o).toLowerCase());
          if (!(lower.includes('yes') && lower.includes('no'))) {
            reject('not_binary');
            continue;
          }

          // HARD GATE, and the reason it exists is worth restating: Gamma's
          // search is fuzzy full-text over descriptions as well as titles, and
          // it is bad. Searching "artificial general intelligence" on
          // 2026-09-22 returned nineteen live markets about how many times
          // Netanyahu would say "Israel" in a speech. The API is the
          // untrustworthy part, so we re-filter locally and keep only markets
          // whose QUESTION is about AI. On the run above this rejected 261.
          const verdict = matchAiQuestion(m.question, { slug: m.slug, eventSlug: event?.slug });
          if (!verdict.match) {
            reject(verdict.via === 'excluded' ? 'off_topic_excluded' : 'off_topic');
            continue;
          }
          if (verdict.via === 'allow') allowListed++;

          // null means Polymarket has no prior-day reference for this market
          // (usually brand new). Skipped, never coerced to 0 — a zero would be
          // read as "this market was calm", which is a claim we cannot make.
          const change = m.oneDayPriceChange;
          if (change === null || change === undefined) {
            reject('no_1d_reference');
            continue;
          }
          const move = Math.abs(Number(change));
          if (!Number.isFinite(move)) {
            reject('no_1d_reference');
            continue;
          }

          const volume = Number(m.volumeNum ?? 0);
          if (!Number.isFinite(volume) || volume <= 0) {
            reject('never_traded');
            continue;
          }

          passedScreen++;

          const yesIdx = lower.indexOf('yes');
          const yes = Number(prices[yesIdx]);

          const candidate = {
            question: m.question,
            slug: m.slug,
            event_slug: eventKey,
            move,
            volume,
            yes: Number.isFinite(yes) ? yes : null,
            end_date: typeof m.endDate === 'string' ? m.endDate : null,
          };

          // One vote per event: keep the deepest-traded leg. The slug
          // tie-break makes the choice total, so two runs over identical data
          // pick the same leg (CONTRACT §1.4 — no unseeded nondeterminism).
          const held = basket.get(eventKey);
          if (
            !held ||
            candidate.volume > held.volume ||
            (candidate.volume === held.volume && String(candidate.slug) < String(held.slug))
          ) {
            if (held) reject('ladder_leg_collapsed');
            basket.set(eventKey, candidate);
          } else {
            reject('ladder_leg_collapsed');
          }
        }
      }
    }

    if (basket.size < MIN_EVENTS) {
      throw new Error(
        `polymarket: only ${basket.size} live AI questions passed screening of ${screened} markets ` +
        `(need ${MIN_EVENTS}); basket too thin to average`
      );
    }

    const members = [...basket.values()];
    const totalVolume = members.reduce((s, m) => s + m.volume, 0);
    if (!(totalVolume > 0)) {
      throw new Error('polymarket: basket has zero total volume; cannot volume-weight');
    }

    const value = members.reduce((s, m) => s + m.move * m.volume, 0) / totalVolume;
    if (!Number.isFinite(value)) {
      throw new Error(`polymarket: weighted mean resolved to non-finite ${value}`);
    }

    // Top contributors go in the receipt so a stranger can see which questions
    // moved the number and argue with the basket instead of trusting it.
    const topContributors = members
      .slice()
      .sort((a, b) => b.volume * b.move - a.volume * a.move || String(a.slug).localeCompare(String(b.slug)))
      .slice(0, 8)
      .map((m) => ({ question: m.question, slug: m.slug, move: m.move, volume: m.volume }));

    // Display list: what the site shows next to the news.
    //
    // Ranked by VOLUME, not by today's move, and that is a stability decision
    // rather than an aesthetic one. Volume is near-monotonic, so the same
    // eight questions sit in the sidebar run after run while their odds update
    // underneath; ranking by move would reshuffle the panel every fifteen
    // minutes and read as noise. The slug tie-break makes the order total.
    const topMarkets = members
      .slice()
      .sort((a, b) => b.volume - a.volume || String(a.slug).localeCompare(String(b.slug)))
      .slice(0, TOP_MARKETS)
      .map((m) => ({
        question: m.question,
        url: eventUrl(m.event_slug),
        // YES price on a $1 contract, already a probability. Three decimals is
        // a tenth of a cent, finer than Polymarket's own tick.
        probability: m.yes === null ? null : Math.round(m.yes * 1000) / 1000,
        volume: m.volume,
        // Three venues, three currencies. Named per row so a consumer merging
        // the lists cannot add dollars to contracts to MANA.
        volume_unit: 'usd',
        close_time: m.end_date,
        source: 'polymarket',
      }));

    return {
      value,
      unit: 'prob_points/day',
      observed_at: new Date().toISOString(),
      meta: {
        terms: TERMS,
        markets_screened: screened,
        markets_passing_screen: passedScreen,
        // One member per event after the ladder collapse. This is the number
        // the weighted mean is taken over.
        markets_in_basket: basket.size,
        events_in_basket: basket.size,
        rejected,
        // Kept as a top-level field because it is the headline auditability
        // number: how many markets Polymarket's own search handed us that were
        // not about AI at all.
        rejected_off_topic: (rejected.off_topic ?? 0) + (rejected.off_topic_excluded ?? 0),
        // Members admitted by AI_SLUG_ALLOW rather than by keyword score.
        allow_listed: allowListed,
        match_rule: 'matchAiQuestion v1: slug allow-list, then exclusions, then keyword score >= 2',
        total_volume_usd: totalVolume,
        max_single_market_weight: Math.max(...members.map((m) => m.volume)) / totalVolume,
        // Context only. This is the number we deliberately do NOT score on.
        unweighted_mean_yes_price:
          members.reduce((s, m) => s + (m.yes ?? 0), 0) / members.length,
        top_contributors: topContributors,
        top_markets: topMarkets,
        direction: 'higher = live-money AI markets repricing harder',
        definition:
          'volume-weighted mean |1-day YES price change| across live independent binary ' +
          'AI questions, one member per event (deepest-traded leg), negRisk excluded',
      },
    };
  },
};
