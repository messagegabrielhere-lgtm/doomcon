#!/usr/bin/env node
// THE RACE — the key-players leaderboard. Writes data/race.json.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/race.mjs
//
// docs/SUB-INDICES.md §1 specifies this page: "Who is winning, and how sure is
// the money?" It is the most shareable surface on the site, so every number on
// it has to survive a stranger clicking through to check it.
//
// ───────────────────────────────────────────────────────────────────────────
// THE DATA UNLOCK, and why it does not contradict the index.
//
// Polymarket runs negRisk markets: "Which company has best AI model end of
// 2026?" is one event sliced into mutually-exclusive legs whose YES prices sum
// to ~1 by construction. collector/sources/polymarket.mjs EXCLUDES those legs
// from the index scalar, and that exclusion is correct — averaging a LEVEL
// across N buckets measures how many buckets exist, so adding a 33rd contender
// would move the index with no news in the world.
//
// As a LEADERBOARD the same structure is ideal: each leg is a live,
// money-backed probability attached to a named lab. The thing that is useless
// for scoring is exactly the right thing for display. Nothing in this file
// feeds the DOOMCON scalar; data/race.json is read only by the /race page.
// docs/SUB-INDICES.md, "Shared rules": a page can be interesting without being
// load-bearing, and conflating the two is how an index becomes a vibe.
// ───────────────────────────────────────────────────────────────────────────
//
// WHAT THIS FILE REFUSES TO DO
//
// It never invents a number. Every field is one of:
//   live      measured this run
//   dormant   the channel answered and the honest answer is 0
//   absent    the player does not use this channel at all (≠ 0)
//   dark      the fetch or the parse failed
//   no_market the venue lists no leg for this player (≠ 0% probability)
// A missing signal is reported missing. It is never imputed and never zeroed,
// because "0%" and "nobody is offering this bet" are different claims and only
// one of them is true.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fetchJson, fetchText, fetchAll } from './fetch.mjs';
import { extractEntities } from './news-sources/_entities.mjs';

const SCHEMA_VERSION = 1;
const FORMULA_VERSION = '1.0.0';

const OUTPUT_URL = new URL('../data/race.json', import.meta.url);
const NEWS_URL = new URL('../data/news.json', import.meta.url);

const DAY_MS = 24 * 60 * 60 * 1000;
const SHIP_WINDOW_DAYS = 30;

// GitHub's releases.atom returns the 10 most recent releases and nothing else;
// `?page=2` returns page 1 again (measured in collector/sources/github-releases.mjs,
// 2026-09-23). When all 10 land inside the window the true count is >= 10 and
// we cannot see how much more, so the number is published as a FLOOR and
// labelled as one rather than quietly understated.
const ATOM_FEED_CAP = 10;

// Hugging Face returns at most this many repos per page. Same treatment: if the
// last row on the page is still inside the window, the count is a floor.
const HF_PAGE_LIMIT = 100;

// ───────────────────────────────────────────────────────────────────────────
// THE PLAYERS
//
// Fixed roster, frozen here, matching docs/SUB-INDICES.md §1. A leaderboard
// whose membership changes run to run is not a leaderboard, it is a rolling
// screenshot of somebody's search results.
//
// `principal` is the person the operator's brief asks us to follow ("follow key
// players like Musk etc"). It is null where no single principal is the public
// face of the lab — Alibaba's Qwen team has no Altman-equivalent figurehead,
// and inventing one to fill a column is exactly the kind of confident-looking
// fabrication this project exists to refuse.
//
// `entities` are canonical names from the PUBLISHED vocabulary in
// news-sources/_entities.mjs. They are NOT re-derived here: writing a second
// extractor would give us two vocabularies that can disagree about the same
// headline. `probe` is the tripwire — a surface form that must resolve to that
// exact canonical name. assertEntityVocabulary() runs every probe on startup
// and dies loudly if _entities.mjs renames anything underneath us.
//
// `poly` / `kalshi` are the leg titles each venue uses. They are aliases, not
// guesses: xAI trades as "xAI" on Polymarket's year-end event and as
// "SpaceXAI" on the monthly ones (measured 2026-09-23), and Kalshi spells
// DeepSeek "Deepseek". Any live leg that matches no alias is reported in
// `unmapped_legs` so a renamed leg shows up as drift instead of as a silent
// null.
// ───────────────────────────────────────────────────────────────────────────
const PLAYERS = Object.freeze([
  {
    id: 'openai',
    name: 'OpenAI',
    principal: 'Sam Altman',
    principal_role: 'CEO',
    poly: ['OpenAI'],
    kalshi: ['OpenAI'],
    entities: [
      { name: 'OpenAI', probe: 'OpenAI' },
      { name: 'GPT', probe: 'GPT-5' },
      { name: 'o-series', probe: 'o3' },
      { name: 'Sora', probe: 'Sora' },
      { name: 'Whisper', probe: 'Whisper' },
    ],
    repos: ['openai/openai-python', 'openai/openai-node', 'openai/codex', 'openai/openai-agents-python'],
    hf_authors: ['openai'],
    or_prefixes: ['openai'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    principal: 'Dario Amodei',
    principal_role: 'CEO',
    poly: ['Anthropic'],
    kalshi: [],
    entities: [
      { name: 'Anthropic', probe: 'Anthropic' },
      { name: 'Claude', probe: 'Claude' },
    ],
    repos: [
      'anthropics/anthropic-sdk-python',
      'anthropics/anthropic-sdk-typescript',
      'anthropics/claude-code',
      'anthropics/claude-agent-sdk-python',
    ],
    hf_authors: ['Anthropic'],
    or_prefixes: ['anthropic'],
  },
  {
    id: 'google-deepmind',
    name: 'Google DeepMind',
    principal: 'Demis Hassabis',
    principal_role: 'CEO, Google DeepMind',
    poly: ['Google'],
    kalshi: [],
    entities: [
      { name: 'Google DeepMind', probe: 'Google DeepMind' },
      { name: 'Gemini', probe: 'Gemini' },
      { name: 'Gemma', probe: 'Gemma' },
      { name: 'Veo', probe: 'Veo' },
    ],
    repos: [
      'googleapis/python-genai',
      'googleapis/js-genai',
      'google-gemini/gemini-cli',
      'google-deepmind/mujoco',
    ],
    hf_authors: ['google'],
    or_prefixes: ['google'],
  },
  {
    id: 'xai',
    name: 'xAI',
    principal: 'Elon Musk',
    principal_role: 'Founder',
    // Both spellings are live on Polymarket right now: the year-end event lists
    // "xAI", the monthly events list "SpaceXAI". Mapping only one would drop
    // the player from one of the two markets and print a null that means
    // "we did not look properly", not "no market exists".
    poly: ['xAI', 'SpaceXAI'],
    kalshi: ['xAI'],
    entities: [
      { name: 'xAI', probe: 'xAI' },
      { name: 'Grok', probe: 'Grok' },
    ],
    // One repo, and that is the measurement, not an oversight. xai-org/grok-1
    // and xai-org/grok-prompts carry zero releases in their Atom feeds — see
    // the basket rule below, which admits a repo only if it has ever cut one.
    repos: ['xai-org/xai-sdk-python'],
    hf_authors: ['xai-org'],
    or_prefixes: ['x-ai'],
  },
  {
    id: 'meta',
    name: 'Meta AI',
    principal: 'Mark Zuckerberg',
    principal_role: 'CEO, Meta',
    poly: ['Meta'],
    kalshi: ['Meta'],
    entities: [
      { name: 'Meta AI', probe: 'Meta AI' },
      { name: 'Llama', probe: 'Llama' },
    ],
    repos: [
      'meta-llama/llama-models',
      'meta-llama/llama-cookbook',
      'facebookresearch/faiss',
      'facebookresearch/xformers',
    ],
    hf_authors: ['meta-llama', 'facebook'],
    // Two prefixes: the Llama weights ship under `meta-llama/`, the newer
    // hosted models under `meta/`. One prefix would undercount by half.
    or_prefixes: ['meta', 'meta-llama'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    principal: 'Liang Wenfeng',
    principal_role: 'Founder',
    poly: ['DeepSeek'],
    kalshi: ['Deepseek'],
    entities: [
      { name: 'DeepSeek', probe: 'DeepSeek' },
      { name: 'DeepSeek-R', probe: 'DeepSeek-R1' },
    ],
    repos: [
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepEP',
      'deepseek-ai/DeepGEMM',
    ],
    hf_authors: ['deepseek-ai'],
    or_prefixes: ['deepseek'],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    principal: 'Arthur Mensch',
    principal_role: 'CEO',
    poly: ['Mistral'],
    kalshi: ['Mistral'],
    entities: [
      { name: 'Mistral', probe: 'Mistral AI' },
      { name: 'Mixtral', probe: 'Mixtral' },
    ],
    repos: [
      'mistralai/client-python',
      'mistralai/mistral-common',
      'mistralai/client-ts',
      'mistralai/mistral-inference',
    ],
    hf_authors: ['mistralai'],
    or_prefixes: ['mistralai'],
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen',
    // No principal. Qwen is a team inside Alibaba Cloud with no single public
    // figurehead of the Altman/Musk kind. Naming a plausible executive to keep
    // the column tidy would be a fabrication, so the cell stays empty and says
    // why.
    principal: null,
    principal_role: null,
    poly: ['Alibaba'],
    kalshi: ['Alibaba'],
    entities: [
      { name: 'Alibaba Qwen', probe: 'Qwen' },
      { name: 'Qwen', probe: 'Qwen' },
    ],
    // QwenLM/Qwen3, Qwen2.5-VL and Qwen3-Coder carry zero releases: Qwen ships
    // weights to the Hugging Face Hub, not GitHub tags. The basket rule keeps
    // them out and the HF column is where Qwen's shipping actually shows up.
    repos: ['QwenLM/qwen-code', 'QwenLM/Qwen-Agent'],
    hf_authors: ['Qwen'],
    or_prefixes: ['qwen'],
  },
]);

// ───────────────────────────────────────────────────────────────────────────
// LOUDNESS — and the honest answer to the operator's brief.
//
// The brief asks for "public posting/appearance cadence of the principal, ONLY
// from feeds we can legitimately fetch." Applied literally, that leaves almost
// nothing, and the empty column IS the finding:
//
//   X / Twitter    where six of these eight people actually post. Scraping it
//                  carries an explicit permanent-suspension penalty under the
//                  developer terms, so it is off the table. Not "hard" — off.
//   Facebook / IG  no free feed of a person's posts at any documented path.
//   Personal sites darioamodei.com/rss and /feed.xml both 404 (measured
//                  2026-09-23); hassabis.com serves a 114-byte JS redirect.
//
// One legitimate feed exists, and it is published by the principal himself:
// blog.samaltman.com is a Posthaven blog and Posthaven serves /posts.atom.
//
// THE POSTHAVEN TRAP, measured 2026-09-23 and the reason this file parses
// <published> and not <updated>: every entry's <updated> is within the last
// few days regardless of when it was written. "The Gentle Singularity"
// (published 2025-06-10) carries updated=2026-09-23. Counting <updated> would
// report Altman as blogging ten times this week; the truth is that his newest
// post is from 2025-10-04 and his blog has been quiet for nearly a year. An
// <updated> timestamp on this platform means "the CDN touched it", not "the
// author wrote it".
// ───────────────────────────────────────────────────────────────────────────
const PRINCIPAL_FEEDS = Object.freeze({
  openai: {
    url: 'https://blog.samaltman.com/posts.atom',
    label: 'blog.samaltman.com',
    platform: 'posthaven-atom',
  },
});

const NO_FEED_REASON = Object.freeze({
  anthropic: 'darioamodei.com publishes essays but serves no feed: /rss and /feed.xml both returned HTTP 404 (probed 2026-09-23).',
  'google-deepmind': 'No personal feed. hassabis.com serves a 114-byte JavaScript redirect, not a document (probed 2026-09-23).',
  xai: 'Posts on X. Scraping X carries an explicit permanent-suspension penalty under its developer terms, so this cell is empty by policy, not by accident.',
  meta: 'Posts on Facebook and Instagram, neither of which exposes a free per-person feed at any documented path.',
  deepseek: 'Liang Wenfeng maintains no public feed in any language we can fetch.',
  mistral: 'No personal feed. Mistral publishes as a company; Arthur Mensch does not.',
  qwen: 'No principal to follow — see the roster note.',
});

// ───────────────────────────────────────────────────────────────────────────
// POLYMARKET — the rank basis
// ───────────────────────────────────────────────────────────────────────────

const GAMMA_SEARCH = 'https://gamma-api.polymarket.com/public-search';

// Frozen search terms. Fixed for the same reason polymarket.mjs fixes its own:
// a basket whose selection rule moves is not a time series.
const POLY_TERMS = Object.freeze(['best AI model', 'AI model']);

// The canonical series, and ONLY it. Polymarket also runs
// "…on LiveBench (Coding)…", "…(Style Control On)", "…Text Arena Math…" and
// "Best Chinese AI Company…" variants of the same sentence. Those are different
// questions with different resolution sources, and mixing them would produce a
// leaderboard nobody could reproduce. Anchored at both ends on purpose.
const POLY_TITLE = /^which company has (?:the )?best ai model end of [^?]+\?$/i;

// Minimum live legs before we are willing to call an event a leaderboard.
const POLY_MIN_LIVE_LEGS = 8;

/** Decoder for Polymarket's JSON-encoded string arrays.
 *
 * `outcomes` and `outcomePrices` arrive as the literal characters
 * ["0.175","0.825"] inside the JSON and must be parsed a second time; the
 * prices inside are strings too. This mirrors parseEncodedArray() in
 * collector/sources/polymarket.mjs, which is private to that module — this
 * agent does not own that file and cannot export it, so the duplication is
 * declared here rather than hidden. If the shape ever changes, both copies
 * need the same edit and this comment is the pointer to the other one.
 *
 * Returns null instead of throwing when the field is simply absent: the
 * placeholder legs ("Company A" … "Other") that pad every negRisk event carry
 * no outcomePrices at all, and taking the whole source dark over a leg we are
 * about to discard would be a self-inflicted outage.
 */
function decodeEncodedArray(raw, field, id) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    throw new Error(`race: polymarket ${field} on ${id} was ${typeof raw}, expected a JSON-encoded string`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`race: polymarket ${field} on ${id} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`race: polymarket ${field} on ${id} decoded to ${typeof parsed}, expected an array`);
  }
  return parsed;
}

/** A finite number, or null. Never 0. `0` is a price; `null` is an absence. */
function finiteOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function polymarketEventUrl(slug) {
  return `https://polymarket.com/event/${slug}`;
}

/**
 * Pull the live legs out of one negRisk event.
 *
 * Placeholder legs are the thing to get right. Every one of these events is
 * padded with "Company A" … "Company K" and "Other" so the operator can add a
 * contender later without redeploying. They carry active:false and either
 * volume 0 with a 0.5 price or no outcomePrices at all. Counting them would
 * put eleven fictional labs on the leaderboard at 50%.
 */
function readNegRiskEvent(event) {
  const legs = [];
  let placeholders = 0;
  let unpriced = 0;

  for (const m of event.markets ?? []) {
    const id = m.conditionId ?? m.id ?? m.slug;
    if (m.active !== true) { placeholders += 1; continue; }

    const outcomes = decodeEncodedArray(m.outcomes, 'outcomes', id);
    const prices = decodeEncodedArray(m.outcomePrices, 'outcomePrices', id);
    if (!outcomes || !prices || outcomes.length !== prices.length) { unpriced += 1; continue; }

    const yesIdx = outcomes.map((o) => String(o).toLowerCase()).indexOf('yes');
    if (yesIdx < 0) { unpriced += 1; continue; }

    const probability = finiteOrNull(prices[yesIdx]);
    if (probability === null) { unpriced += 1; continue; }

    legs.push({
      title: String(m.groupItemTitle ?? m.question ?? '').trim(),
      probability,
      // undefined on legs Polymarket has no week-old reference for. Kept as
      // null, never coerced to 0: "the price did not move" and "we have no
      // price from a week ago" are different sentences.
      change_7d: finiteOrNull(m.oneWeekPriceChange),
      change_1d: finiteOrNull(m.oneDayPriceChange),
      volume_usd: Number(m.volumeNum ?? 0),
      slug: m.slug ?? null,
    });
  }

  // Total order so two runs over identical data emit identical JSON.
  legs.sort((a, b) => b.probability - a.probability || a.title.localeCompare(b.title));

  return {
    slug: event.slug,
    title: event.title,
    url: polymarketEventUrl(event.slug),
    end_date: typeof event.endDate === 'string' ? event.endDate : null,
    legs,
    legs_total: (event.markets ?? []).length,
    legs_live: legs.length,
    placeholder_legs: placeholders,
    unpriced_legs: unpriced,
    // Sums to ~1 by construction. Published because it is the one-line proof
    // that these legs are a partition and not eight independent bets — and
    // because a sum that drifts far from 1 is the first sign the event stopped
    // being what we think it is.
    sum_of_live_legs: round(legs.reduce((s, l) => s + l.probability, 0), 4),
    volume_usd: Math.round(legs.reduce((s, l) => s + l.volume_usd, 0)),
  };
}

/**
 * Find the two markets the page runs on.
 *
 * SPOT    the canonical event resolving soonest — "who holds the crown today".
 * HORIZON the canonical event resolving latest — "where the money thinks this
 *         ends up". This is the rank basis.
 *
 * Horizon, not spot, carries the ranking, and that is a measured choice. On
 * 2026-09-23 the spot event (end of September, resolving in seven days) had
 * Anthropic at 98.75% and every other lab at or below 0.85% — true, and a
 * degenerate leaderboard. The year-end event had 73.5 / 12.5 / 10.0 / 2.5 /
 * 2.05 / 0.95 / 0.55 / 0.15, which is a distribution you can argue with. It is
 * also the question the operator's brief actually asks: rank their LIKELIHOODS.
 *
 * Both are published. Spot is the second column.
 */
async function collectPolymarket() {
  const seen = new Map();

  for (const term of POLY_TERMS) {
    const qs = new URLSearchParams({
      q: term,
      limit_per_type: '40',
      // Without this the search cheerfully returns events that resolved in 2024.
      events_status: 'active',
    });
    const body = await fetchJson(`${GAMMA_SEARCH}?${qs}`);
    if (!Array.isArray(body?.events)) {
      throw new Error(
        `race: polymarket term "${term}" returned no events array ` +
        `(keys: ${Object.keys(body ?? {}).join(',') || 'none'})`,
      );
    }
    for (const ev of body.events) {
      if (!ev?.slug || seen.has(ev.slug)) continue;
      if (ev.negRisk !== true) continue;
      if (!POLY_TITLE.test(String(ev.title ?? '').trim())) continue;
      seen.set(ev.slug, ev);
    }
  }

  const candidates = [...seen.values()]
    .map(readNegRiskEvent)
    .filter((e) => e.legs_live >= POLY_MIN_LIVE_LEGS && e.end_date !== null)
    // Ascending by resolution date, slug breaking the tie: a total order, so
    // "earliest" and "latest" are the same two events on every run.
    .sort((a, b) => Date.parse(a.end_date) - Date.parse(b.end_date) || a.slug.localeCompare(b.slug));

  if (candidates.length === 0) {
    throw new Error(
      `race: no live Polymarket event matched ${POLY_TITLE} with at least ` +
      `${POLY_MIN_LIVE_LEGS} priced legs across terms [${POLY_TERMS.join(', ')}]. ` +
      `The leaderboard has no rank basis; refusing to publish a ranking.`,
    );
  }

  const spot = candidates[0];
  const horizon = candidates[candidates.length - 1];

  return {
    ok: true,
    horizon,
    spot,
    // Equal when only one instance of the series is trading. Said out loud so
    // the page does not print two columns of the same number as if they were
    // two opinions.
    horizon_is_spot: horizon.slug === spot.slug,
    candidates: candidates.map((c) => ({ slug: c.slug, end_date: c.end_date, legs_live: c.legs_live, volume_usd: c.volume_usd })),
    title_rule: String(POLY_TITLE),
    terms: POLY_TERMS,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// KALSHI — the regulated cross-check
//
// KXTOPAI, "Which companies will have a top-ranked AI model this year?", is a
// better-shaped instrument than Polymarket's for a leaderboard and a worse one
// for a partition: mutually_exclusive is false, so each company is an
// INDEPENDENT binary bet and the legs do not sum to 1. That means the two
// venues answer subtly different questions — "will hold the single best model
// at a fixed date" versus "will be top-ranked at some point this year" — and
// the page has to say so rather than present them as one number seen twice.
//
// Prices come from the *_dollars decimal STRING fields. The integer fields
// every older doc refers to (last_price, previous_price, volume) do not exist
// on trade-api/v2 at all, and Number(undefined ?? 0) is a silent 0, which is
// how an adapter written from memory produces a basket of markets priced at
// zero that never move. See the field-name trap at the top of
// collector/sources/kalshi.mjs.
// ───────────────────────────────────────────────────────────────────────────

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_SERIES = 'KXTOPAI';

/** Loud parser for a `*_dollars` decimal string. Never defaults. */
function kalshiDollars(raw, field, ticker) {
  if (raw === undefined || raw === null) {
    throw new Error(
      `race: kalshi ${field} is ${raw} on ${ticker}. Every price on trade-api/v2 is a ` +
      `decimal STRING in a *_dollars field; the integer fields do not exist here. ` +
      `Do not substitute them and do not default to 0.`,
    );
  }
  if (typeof raw !== 'string') {
    throw new Error(`race: kalshi ${field} on ${ticker} was ${typeof raw} (${String(raw)}), expected a decimal string such as "0.2400"`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`race: kalshi ${field} on ${ticker} is "${raw}", which is not a number`);
  return n;
}

function kalshiFixedPoint(raw, field, ticker) {
  if (typeof raw !== 'string') {
    throw new Error(`race: kalshi ${field} on ${ticker} was ${typeof raw}, expected a fixed-point decimal string such as "95823.60"`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`race: kalshi ${field} on ${ticker} is "${raw}", which is not a number`);
  return n;
}

async function collectKalshi() {
  const qs = new URLSearchParams({
    series_ticker: KALSHI_SERIES,
    status: 'open',
    with_nested_markets: 'true',
    limit: '200',
  });
  const body = await fetchJson(`${KALSHI_API}/events?${qs}`);
  if (!Array.isArray(body?.events)) {
    // A throttle arrives as a real HTTP 429 and fetch.mjs turns it into a
    // FetchError. This branch is the other failure: a 200 whose shape changed.
    throw new Error(`race: kalshi ${KALSHI_SERIES} returned no events array (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`);
  }
  const event = body.events[0];
  if (!event) throw new Error(`race: kalshi ${KALSHI_SERIES} has no open event; the cross-check market has closed`);

  const legs = [];
  let inactive = 0;
  for (const m of event.markets ?? []) {
    const ticker = m.ticker;
    if (typeof ticker !== 'string' || !ticker) continue;
    // status 'inactive' with volume 0 is a listed-but-never-opened leg
    // (Zhipu AI on 2026-09-23). It is not a 0% chance, it is no market.
    if (m.status !== 'active') { inactive += 1; continue; }

    const last = kalshiDollars(m.last_price_dollars, 'last_price_dollars', ticker);
    const prev = kalshiDollars(m.previous_price_dollars, 'previous_price_dollars', ticker);
    const volume = kalshiFixedPoint(m.volume_fp, 'volume_fp', ticker);

    legs.push({
      title: String(m.yes_sub_title ?? '').trim(),
      ticker,
      probability: last,
      // 24 HOURS, not 7 days. Kalshi's trade-api/v2 exposes no weekly
      // reference at all, and labelling a 24h move as a 7d move to make the
      // columns line up would be a lie for the sake of a tidy table.
      change_24h: last > 0 && prev > 0 ? round(last - prev, 4) : null,
      change_24h_state: last > 0 && prev > 0 ? 'live' : 'no_reference',
      volume_contracts: volume,
      close_time: typeof m.close_time === 'string' ? m.close_time : null,
    });
  }
  legs.sort((a, b) => b.probability - a.probability || a.ticker.localeCompare(b.ticker));

  return {
    ok: true,
    series: KALSHI_SERIES,
    event_ticker: event.event_ticker ?? null,
    title: event.title ?? null,
    url: `https://kalshi.com/markets/${KALSHI_SERIES.toLowerCase()}`,
    mutually_exclusive: event.mutually_exclusive === true,
    legs,
    legs_live: legs.length,
    inactive_legs: inactive,
    // Independent binaries, so this is NOT expected to be 1. Published for the
    // same reason Polymarket's sum is: it is the shape of the instrument.
    sum_of_live_legs: round(legs.reduce((s, l) => s + l.probability, 0), 4),
    volume_contracts: round(legs.reduce((s, l) => s + l.volume_contracts, 0), 2),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// MANIFOLD — a measured exclusion, re-measured every run
//
// Manifold is the third venue in the markets pillar and it is play money.
// There is exactly one comparable question on it, and it is far too thin to
// put beside a $1.4M real-money event: on 2026-09-23 "Which company has the
// best LLM at the end of 2026? (Artificial analysis leaderboard)" carried
// 1,117 MANA of lifetime volume.
//
// The exclusion is re-run live rather than asserted in a comment, because a
// static claim about someone else's site is exactly the kind of thing that
// silently goes stale. If Manifold ever gets a deep market, the floor lets it
// in on its own.
// ───────────────────────────────────────────────────────────────────────────

const MANIFOLD_SEARCH = 'https://api.manifold.markets/v0/search-markets';
const MANIFOLD_TERM = 'best LLM 2026';
const MANIFOLD_TITLE = /which company has the best (llm|ai model)/i;
// MANA, lifetime. Below this the "market" is a handful of forecasters and the
// column would be noise wearing a probability's clothes.
const MANIFOLD_VOLUME_FLOOR = 20_000;

async function collectManifold() {
  const qs = new URLSearchParams({ term: MANIFOLD_TERM, limit: '25', sort: 'liquidity', filter: 'open' });
  const rows = await fetchJson(`${MANIFOLD_SEARCH}?${qs}`);
  if (!Array.isArray(rows)) {
    throw new Error(`race: manifold search returned ${typeof rows}, expected an array`);
  }
  const candidates = rows
    .filter((r) => r?.outcomeType === 'MULTIPLE_CHOICE' && MANIFOLD_TITLE.test(String(r.question ?? '')))
    .map((r) => ({
      id: r.id,
      question: r.question,
      url: r.url ?? null,
      volume_mana: Math.round(Number(r.volume ?? 0)),
      liquidity_mana: Math.round(Number(r.totalLiquidity ?? 0)),
    }))
    .sort((a, b) => b.volume_mana - a.volume_mana || String(a.id).localeCompare(String(b.id)));

  const best = candidates[0] ?? null;
  const included = Boolean(best && best.volume_mana >= MANIFOLD_VOLUME_FLOOR);

  return {
    ok: true,
    included,
    term: MANIFOLD_TERM,
    title_rule: String(MANIFOLD_TITLE),
    volume_floor_mana: MANIFOLD_VOLUME_FLOOR,
    candidates,
    excluded_reason: included
      ? null
      : best
        ? `The only comparable Manifold market carries ${best.volume_mana.toLocaleString('en-US')} MANA of play money against the floor of ${MANIFOLD_VOLUME_FLOOR.toLocaleString('en-US')}. Published as a measured exclusion, not omitted.`
        : `No Manifold market matched ${MANIFOLD_TITLE} for the term "${MANIFOLD_TERM}".`,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// SHIPPING — three instruments, each with a different bias, never summed
//
// There is no single honest "shipping velocity" scalar, and building one would
// have been the easiest mistake in this file. The three channels measure
// genuinely different things and they are biased in opposite directions:
//
//   GitHub releases   measures RELEASE ENGINEERING. OpenAI, Anthropic and
//                     Google auto-cut an SDK tag on every API change, several
//                     a week. DeepSeek and Qwen ship model weights and never
//                     cut a tag. A lab that scores 0 here has not stopped
//                     shipping; it ships somewhere else.
//   Hugging Face      measures OPEN-WEIGHT PUBLICATION. Structurally zero for
//                     any lab that does not publish weights, and Anthropic
//                     does not have an account at all — which is `absent`,
//                     a different fact from 0.
//   OpenRouter        measures WHEN OPENROUTER LISTED A MODEL. It is NOT the
//                     vendor's announcement date and is never labelled as one.
//                     It is the most comparable of the three because all eight
//                     players are in the catalogue.
//
// So all three are published side by side with their units attached, and the
// page compares a lab to its own channels rather than pretending one number
// ranks them. Adding them together would have produced a tidy column that
// meant nothing.
// ───────────────────────────────────────────────────────────────────────────

const githubFeedUrl = (repo) => `https://github.com/${repo}/releases.atom`;

/**
 * Release timestamps from an Atom feed.
 *
 * Scoped to <entry> blocks: the feed carries a document-level <updated> before
 * the first entry and a global match would count the feed itself as a release.
 * Entries are not ordered by <updated> (GitHub orders by release creation), so
 * every entry is read — no early break.
 */
function releaseTimestamps(xml, repo) {
  const stamps = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const raw = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    if (!raw) throw new Error(`race: github ${repo} has an <entry> with no <updated>`);
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) throw new Error(`race: github ${repo} has unparseable <updated> "${raw}"`);
    stamps.push(t);
  }
  return stamps;
}

async function collectGithub(nowMs) {
  const cutoff = nowMs - SHIP_WINDOW_DAYS * DAY_MS;
  const jobs = [];
  for (const p of PLAYERS) for (const repo of p.repos) jobs.push({ key: `${p.id}\u0000${repo}`, url: githubFeedUrl(repo), parse: 'text' });

  const results = await fetchAll(jobs, { concurrency: 4 });
  const byPlayer = new Map(PLAYERS.map((p) => [p.id, { per_repo: {}, failed: [], truncated: [] }]));

  for (const r of results) {
    const [pid, repo] = r.key.split('\u0000');
    const bucket = byPlayer.get(pid);
    if (!r.ok) {
      // Named, never dropped. github-releases.mjs makes the same call for the
      // index: a repo we could not reach contributes 0, which is
      // indistinguishable from a repo that shipped nothing — imputation by
      // omission. Here the basket is per player and a partial basket only
      // damages one row, so the run continues and the row says how many of its
      // repos answered.
      bucket.failed.push({ repo, status: r.error.status ?? null, error: r.error.message });
      continue;
    }
    const stamps = releaseTimestamps(r.value, repo);
    const inWindow = stamps.filter((t) => t >= cutoff).length;
    bucket.per_repo[repo] = inWindow;
    // All ten available entries fell inside the window, so the real count is
    // >= 10 and the feed cannot tell us more.
    if (stamps.length >= ATOM_FEED_CAP && inWindow === stamps.length) bucket.truncated.push(repo);
  }

  const out = {};
  for (const p of PLAYERS) {
    const b = byPlayer.get(p.id);
    const answered = Object.keys(b.per_repo).length;
    const releases = Object.values(b.per_repo).reduce((s, n) => s + n, 0);
    out[p.id] = {
      state: answered === 0 ? 'dark' : 'live',
      releases_30d: answered === 0 ? null : releases,
      // A floor, not an estimate. Rendered with a >= on the page.
      is_floor: b.truncated.length > 0 || b.failed.length > 0,
      repos_total: p.repos.length,
      repos_answered: answered,
      per_repo: b.per_repo,
      truncated_repos: b.truncated.slice().sort(),
      failed_repos: b.failed,
      window_days: SHIP_WINDOW_DAYS,
      unit: `releases/${SHIP_WINDOW_DAYS}d`,
    };
  }
  return out;
}

/**
 * Hugging Face model repositories created by the lab's own org in the window.
 *
 * `createdAt` is when the repository appeared on the Hub, which for an org
 * account is a vendor-side publication event — unlike OpenRouter's `created`,
 * which is a third party's listing date.
 *
 * KNOWN DISTORTION, stated rather than corrected: one repo is one event, so a
 * family shipped in six sizes counts six times. Collapsing "Qwen3-4B" and
 * "Qwen3-32B" into one release would require inventing a suffix heuristic, and
 * an invented heuristic in a published number is worse than a disclosed bias.
 */
async function collectHuggingFace(nowMs) {
  const cutoff = nowMs - SHIP_WINDOW_DAYS * DAY_MS;
  const jobs = [];
  for (const p of PLAYERS) {
    for (const author of p.hf_authors) {
      const qs = new URLSearchParams({ author, sort: 'createdAt', direction: '-1', limit: String(HF_PAGE_LIMIT) });
      jobs.push({ key: `${p.id}\u0000${author}`, url: `https://huggingface.co/api/models?${qs}` });
    }
  }
  const results = await fetchAll(jobs, { concurrency: 4 });
  const byPlayer = new Map(PLAYERS.map((p) => [p.id, { authors: {}, failed: [] }]));

  for (const r of results) {
    const [pid, author] = r.key.split('\u0000');
    const bucket = byPlayer.get(pid);
    if (!r.ok) { bucket.failed.push({ author, status: r.error.status ?? null, error: r.error.message }); continue; }
    if (!Array.isArray(r.value)) throw new Error(`race: huggingface author=${author} returned ${typeof r.value}, expected an array — API shape changed`);

    const dated = r.value
      .map((m) => ({ id: m?.id, ms: Date.parse(m?.createdAt) }))
      .filter((m) => Number.isFinite(m.ms));
    const inWindow = dated.filter((m) => m.ms >= cutoff);
    bucket.authors[author] = {
      repos_returned: r.value.length,
      models_30d: inWindow.length,
      newest_at: dated.length ? new Date(Math.max(...dated.map((m) => m.ms))).toISOString() : null,
      // A full page whose oldest row is still inside the window means we cannot
      // see the bottom of the window.
      is_floor: r.value.length >= HF_PAGE_LIMIT && inWindow.length === r.value.length,
      sample: inWindow.slice(0, 5).map((m) => m.id).sort(),
    };
  }

  const out = {};
  for (const p of PLAYERS) {
    const b = byPlayer.get(p.id);
    const names = Object.keys(b.authors);
    const returned = names.reduce((s, a) => s + b.authors[a].repos_returned, 0);
    const stamps = names.map((a) => b.authors[a].newest_at).filter(Boolean).sort();

    // THREE STATES, and the middle one is the point of this block.
    //   dark    nothing answered
    //   absent  the org answered and holds no repositories at all — the lab
    //           does not use this channel. Anthropic has no Hub presence; a
    //           "0" against its name would read as "published nothing this
    //           month", which is a claim about their month rather than about
    //           their distribution strategy.
    //   live    the org publishes here; the count may legitimately be 0.
    let state = 'live';
    if (names.length === 0 || names.every((a) => b.authors[a] === undefined)) state = 'dark';
    else if (b.failed.length === p.hf_authors.length) state = 'dark';
    else if (returned === 0) state = 'absent';

    out[p.id] = {
      state,
      models_30d: state === 'live' ? names.reduce((s, a) => s + b.authors[a].models_30d, 0) : null,
      is_floor: names.some((a) => b.authors[a].is_floor),
      newest_at: stamps.length ? stamps[stamps.length - 1] : null,
      authors: p.hf_authors,
      per_author: b.authors,
      failed_authors: b.failed,
      window_days: SHIP_WINDOW_DAYS,
      unit: `model repos/${SHIP_WINDOW_DAYS}d`,
    };
  }
  return out;
}

/**
 * OpenRouter catalogue, attributed by id prefix.
 *
 * THE LABEL MATTERS. `created` is the unix SECONDS timestamp at which
 * OPENROUTER LISTED the model. It is not the vendor's announcement date, it is
 * frequently days later, and nothing in this file or on the page calls it a
 * release date. The field is named `listed_30d` for that reason.
 *
 * Alias prefixes beginning with `~` (`~openai/gpt-astra-latest`) are moving
 * pointers at another entry, not distinct models, and are excluded and counted.
 */
async function collectOpenRouter(nowMs) {
  const cutoffSeconds = (nowMs - SHIP_WINDOW_DAYS * DAY_MS) / 1000;
  const body = await fetchJson('https://openrouter.ai/api/v1/models');
  if (!Array.isArray(body?.data)) {
    throw new Error(`race: openrouter expected an array at .data, got ${typeof body?.data} — API shape changed`);
  }
  if (body.data.length === 0) {
    throw new Error('race: openrouter catalogue came back empty — treating as a dead source, not as zero activity');
  }

  const byPrefix = new Map();
  let aliases = 0;
  for (const m of body.data) {
    const id = String(m?.id ?? '');
    const prefix = id.split('/')[0];
    if (prefix.startsWith('~')) { aliases += 1; continue; }
    // `created` is unix SECONDS. Comparing it against milliseconds yields zero
    // every run and looks exactly like a quiet month.
    const created = m?.created;
    if (!Number.isFinite(created)) {
      throw new Error(`race: openrouter model "${id || '<no id>'}" has no finite .created (got ${JSON.stringify(created)}) — refusing to guess`);
    }
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push({ id, created });
  }

  const out = {};
  for (const p of PLAYERS) {
    const models = p.or_prefixes.flatMap((pre) => byPrefix.get(pre) ?? []);
    const recent = models.filter((m) => m.created >= cutoffSeconds);
    out[p.id] = {
      // A prefix with no entries at all means the catalogue does not carry this
      // vendor; every player has entries today, but the state is computed, not
      // assumed, so a delisting shows up as `absent` rather than as a 0.
      state: models.length === 0 ? 'absent' : 'live',
      listed_30d: models.length === 0 ? null : recent.length,
      catalogue: models.length,
      newest_listed_at: models.length ? new Date(Math.max(...models.map((m) => m.created)) * 1000).toISOString() : null,
      prefixes: p.or_prefixes,
      window_days: SHIP_WINDOW_DAYS,
      unit: `listings/${SHIP_WINDOW_DAYS}d`,
      // Repeated in the data, not only in this comment, because the JSON
      // travels away from the file that produced it.
      caveat: 'created is when OpenRouter listed the model, not when the vendor announced it.',
    };
  }
  return { per_player: out, catalogue_size: body.data.length, alias_entries_excluded: aliases };
}

// ───────────────────────────────────────────────────────────────────────────
// MINDSHARE — share of OUR news corpus, not share of the internet
// ───────────────────────────────────────────────────────────────────────────

// Known, asymmetric undercounts in the published vocabulary. Declared here
// rather than quietly corrected, because the correction would be a SECOND
// extractor, and two vocabularies that disagree about one headline is a worse
// outcome than one vocabulary with a disclosed hole.
//
// Meta is the live case. _entities.mjs matches 'Meta AI', 'FAIR' and
// 'Meta Superintelligence' but deliberately not the bare token 'Meta' — which is
// the right call for a corpus that is three-quarters ML preprints, where
// "meta-learning" and "meta-analysis" appear constantly and would match across
// the hyphen. The cost lands here: an item headlined "Muse is coming to Meta
// smart glasses" carries no entity, so Meta's share is a FLOOR, not a count.
const MINDSHARE_CAVEATS = Object.freeze({
  meta:
    'Floor, not a count. The published vocabulary matches "Meta AI" but not the bare token "Meta", '
    + 'because "meta-learning" and "meta-analysis" would match it in a corpus that is mostly ML '
    + 'preprints. Headlines that say only "Meta" are not counted here.',
});

/**
 * Fail loudly if _entities.mjs has renamed anything we point at.
 *
 * Mindshare is computed by intersecting each player's canonical entity names
 * with the `entities` array news.mjs already wrote. That array is produced by
 * extractEntities() over the published vocabulary, so the two can never
 * disagree about a headline — but only as long as the names still exist. A
 * renamed entity would silently drop a player to 0% mindshare, which is the
 * most expensive kind of quiet failure this page can have. Each probe is a
 * surface form that must resolve to its canonical name.
 */
function assertEntityVocabulary() {
  const problems = [];
  for (const p of PLAYERS) {
    for (const { name, probe } of p.entities) {
      const got = extractEntities(probe);
      if (!got.includes(name)) {
        problems.push(`${p.id}: probe ${JSON.stringify(probe)} resolved to [${got.join(', ') || 'nothing'}], expected to include ${JSON.stringify(name)}`);
      }
    }
  }
  if (problems.length) {
    throw new Error(
      'race: the entity vocabulary in collector/news-sources/_entities.mjs has moved under this file.\n  ' +
      problems.join('\n  ') +
      '\nFix the `entities` map in collector/race.mjs. Do NOT add a second extractor.',
    );
  }
}

async function loadNews() {
  let raw;
  try {
    raw = await readFile(NEWS_URL, 'utf8');
  } catch (err) {
    return { ok: false, error: `data/news.json is not readable (${err.code ?? err.message}). Run collector/news.mjs first.` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `data/news.json is not valid JSON: ${err.message}` };
  }
  if (!Array.isArray(parsed?.items)) {
    return { ok: false, error: 'data/news.json has no items array' };
  }
  return { ok: true, news: parsed };
}

/**
 * Mindshare, and its trend, over the corpus news.mjs already published.
 *
 * TRAP, measured 2026-09-24 and the reason this function does NOT split on
 * news.json's `window_days`. That field is 7, and the file also carries
 * `max_items: 200`. Both are true and the CAP BINDS FIRST: on the live corpus
 * the 200 newest items spanned 43.8 HOURS, not seven days. Splitting a 7-day
 * nominal window at its midpoint put all 200 items in the recent half and zero
 * in the prior half, so every trend came back null — a total failure of the
 * column that looked like missing data rather than like a wrong denominator.
 *
 * So the split is taken at the midpoint of the corpus's OBSERVED span, and that
 * span is published in hours next to the number. The trend is then labelled for
 * what it is: recent half against prior half of whatever the feed actually
 * covers, which on a busy week is under two days.
 *
 * Shares across players do not sum to 1 and are not meant to: one item naming
 * both OpenAI and Anthropic counts for both. This is "how often is this lab in
 * the conversation", not a partition of the conversation.
 */

// Both halves must carry at least this many items before a share comparison is
// published. Below it the delta is the arithmetic of a handful of headlines, and
// the honest output is null rather than a number with an error bar we do not draw.
const MINDSHARE_MIN_HALF_ITEMS = 20;

function computeMindshare(news) {
  const endMs = Date.parse(news.generated_at);
  if (!Number.isFinite(endMs)) {
    throw new Error(`race: data/news.json needs an ISO generated_at; got ${JSON.stringify(news.generated_at)}`);
  }

  const items = news.items
    .map((it) => ({ entities: Array.isArray(it.entities) ? it.entities : [], ms: Date.parse(it.published_at) }))
    .filter((it) => Number.isFinite(it.ms));

  if (items.length === 0) {
    return { per_player: mindshareUnavailable('data/news.json carries no dated items').per_player, window: null };
  }

  const oldestMs = Math.min(...items.map((it) => it.ms));
  const spanMs = endMs - oldestMs;
  const splitMs = oldestMs + spanMs / 2;

  const recent = items.filter((it) => it.ms >= splitMs);
  const prior = items.filter((it) => it.ms < splitMs);
  const comparable = recent.length >= MINDSHARE_MIN_HALF_ITEMS && prior.length >= MINDSHARE_MIN_HALF_ITEMS;

  // Every distinct entity the corpus actually carries, counted. Published so a
  // reader can inspect the denominator's composition instead of taking the
  // shares on trust: on the live corpus 157 of 200 items are arXiv and Hugging
  // Face papers naming no lab at all, which is most of why every share is small.
  const entityCounts = Object.create(null);
  let itemsWithAnyEntity = 0;
  for (const it of items) {
    if (it.entities.length) itemsWithAnyEntity += 1;
    for (const e of it.entities) entityCounts[e] = (entityCounts[e] ?? 0) + 1;
  }

  const per = {};
  for (const p of PLAYERS) {
    const names = new Set(p.entities.map((e) => e.name));
    const hit = (it) => it.entities.some((n) => names.has(n));
    const all = items.filter(hit).length;
    const r = recent.filter(hit).length;
    const q = prior.filter(hit).length;
    const rShare = recent.length ? r / recent.length : null;
    const qShare = prior.length ? q / prior.length : null;

    per[p.id] = {
      state: 'live',
      items: all,
      corpus: items.length,
      share: round(all / items.length, 4),
      recent_items: r,
      recent_corpus: recent.length,
      recent_share: rShare === null ? null : round(rShare, 4),
      prior_items: q,
      prior_corpus: prior.length,
      prior_share: qShare === null ? null : round(qShare, 4),
      // null, never 0, when either half is too thin to compare.
      delta: comparable ? round(rShare - qShare, 4) : null,
      delta_state: comparable ? 'live' : 'halves_too_thin',
      entities: [...names].sort(),
      // Set only where the published vocabulary is known to undercount this
      // player. See MINDSHARE_CAVEATS.
      caveat: MINDSHARE_CAVEATS[p.id] ?? null,
      is_floor: Boolean(MINDSHARE_CAVEATS[p.id]),
    };
  }

  return {
    per_player: per,
    window: {
      news_generated_at: news.generated_at,
      // Both are published because they disagree, and the disagreement is the
      // whole reason this function does not use the first one.
      nominal_window_days: Number.isFinite(Number(news.window_days)) ? Number(news.window_days) : null,
      observed_span_hours: round(spanMs / 3600000, 1),
      corpus_is_capped: Number.isFinite(Number(news.max_items)) && items.length >= Number(news.max_items),
      max_items: news.max_items ?? null,
      split_at: new Date(splitMs).toISOString(),
      oldest_item_at: new Date(oldestMs).toISOString(),
      corpus: items.length,
      recent_corpus: recent.length,
      prior_corpus: prior.length,
      min_half_items: MINDSHARE_MIN_HALF_ITEMS,
      halves_comparable: comparable,
      items_naming_any_entity: itemsWithAnyEntity,
      entity_counts: Object.fromEntries(Object.entries(entityCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    },
  };
}

function mindshareUnavailable(reason) {
  const per = {};
  for (const p of PLAYERS) per[p.id] = { state: 'dark', error: reason, items: null, corpus: null, share: null, delta: null };
  return { per_player: per, window: null, error: reason };
}

// ───────────────────────────────────────────────────────────────────────────
// LOUDNESS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Posts per window from a Posthaven Atom feed, read from <published>.
 *
 * NEVER <updated>. See the block comment on PRINCIPAL_FEEDS: Posthaven rewrites
 * every entry's <updated> to roughly now, so counting it reports a blog that
 * has been silent for a year as posting daily. This function throws if an entry
 * has no <published> rather than falling back to <updated>, because the
 * fallback is the bug.
 */
function posthavenPublishedStamps(xml, url) {
  const stamps = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const raw = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!raw) {
      throw new Error(
        `race: ${url} has an <entry> with no <published>. Do NOT substitute <updated>: ` +
        `Posthaven rewrites it to roughly now on every entry, which would report a ` +
        `dormant blog as posting daily.`,
      );
    }
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) throw new Error(`race: ${url} has unparseable <published> "${raw}"`);
    stamps.push(t);
  }
  if (stamps.length === 0) throw new Error(`race: ${url} parsed to zero entries — the feed shape changed`);
  return stamps;
}

async function collectLoudness(nowMs) {
  const out = {};
  for (const p of PLAYERS) {
    const feed = PRINCIPAL_FEEDS[p.id];
    if (!feed) {
      out[p.id] = {
        state: 'no_feed',
        posts_30d: null,
        posts_7d: null,
        newest_at: null,
        feed: null,
        reason: NO_FEED_REASON[p.id] ?? 'No legitimate free feed for this principal.',
      };
      continue;
    }
    try {
      const xml = await fetchText(feed.url);
      const stamps = posthavenPublishedStamps(xml, feed.url);
      const newest = Math.max(...stamps);
      const posts30 = stamps.filter((t) => t >= nowMs - 30 * DAY_MS).length;
      out[p.id] = {
        // `dormant`, not `dark`: the feed answered and parsed, and the honest
        // count is 0. Reporting that as dark would claim an outage that is not
        // happening — docs/NEWS.md, "Three source states, not two".
        state: posts30 > 0 ? 'live' : 'dormant',
        posts_30d: posts30,
        posts_7d: stamps.filter((t) => t >= nowMs - 7 * DAY_MS).length,
        newest_at: new Date(newest).toISOString(),
        entries_in_feed: stamps.length,
        feed: { url: feed.url, label: feed.label, platform: feed.platform },
        date_field: 'published',
        reason: null,
      };
    } catch (err) {
      out[p.id] = {
        state: 'dark',
        posts_30d: null,
        posts_7d: null,
        newest_at: null,
        feed: { url: feed.url, label: feed.label, platform: feed.platform },
        reason: errMsg(err),
      };
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// ASSEMBLY
// ───────────────────────────────────────────────────────────────────────────

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function errMsg(err) {
  return err?.message ?? String(err);
}

/** Case-insensitive exact match of a leg title against a player's aliases. */
function matchLeg(legs, aliases) {
  const want = new Set(aliases.map((a) => a.toLowerCase()));
  return legs.find((l) => want.has(l.title.toLowerCase())) ?? null;
}

function pct(p, places = 1) {
  return `${(p * 100).toFixed(places)}%`;
}

function ptSigned(p, places = 1) {
  const v = p * 100;
  const body = Math.abs(v).toFixed(places);
  if (v > 0) return `+${body}`;
  // U+2212 MINUS SIGN, not hyphen-minus: in JetBrains Mono's tabular set the
  // hyphen is a different width and a column of deltas visibly jitters.
  if (v < 0) return `−${body}`;
  return `±${body}`;
}

/**
 * The "why this rank" line. COMPUTED, never written.
 *
 * Two parts. The first is always the player's position and the gap to the
 * leader, because that is literally what the rank is. The second is chosen by
 * a FIXED PRECEDENCE over whichever signals actually have data, so the same
 * inputs always produce the same sentence and no clause can ever cite a null:
 *
 *   1. a 7-day market move of at least half a point
 *   2. a mindshare swing of at least two points
 *   3. anything shipped in the last 30 days
 *   4. the explicit "nothing we measure moved" fallback
 *
 * Every clause it could have used is also emitted as `why_components`, so the
 * page can show the full set and a reader can see what the selector passed over
 * rather than having to trust it.
 */
const MOVE_THRESHOLD = 0.005; // 0.5 probability points
const MINDSHARE_THRESHOLD = 0.02; // 2 percentage points of corpus share

function buildWhy(player, leader) {
  const parts = [];
  const m = player.market;

  if (m.probability === null) {
    parts.push(`No leg on ${m.horizon_event?.title ?? 'the ranking market'}, so no rank: the market is not offering this bet, which is not the same as a 0% chance.`);
  } else if (leader && leader.id === player.id) {
    parts.push(`Market leader at ${pct(m.probability)}${leader.runnerUp ? `, ${ptSigned(m.probability - leader.runnerUp.market.probability)} points clear of ${leader.runnerUp.name}` : ''}.`);
  } else if (leader) {
    parts.push(`${pct(m.probability)}, ${ptSigned(m.probability - leader.market.probability)} points against ${leader.name}.`);
  } else {
    parts.push(`${pct(m.probability)} on the ranking market.`);
  }

  const components = [];
  if (m.change_7d !== null) components.push({ kind: 'move', text: `${ptSigned(m.change_7d)} points over 7 days.` });
  else if (m.probability !== null) components.push({ kind: 'move_missing', text: 'Polymarket has no week-old reference for this leg.' });

  if (m.kalshi) {
    components.push({ kind: 'kalshi', text: `Kalshi's separate "top-ranked this year" contract has them at ${pct(m.kalshi.probability, 0)}.` });
  } else {
    components.push({ kind: 'kalshi_missing', text: 'Kalshi lists no contract for them.' });
  }

  const ms = player.mindshare;
  if (ms.share !== null) {
    const trend = ms.delta === null ? '' : ` (${ptSigned(ms.delta)} points across the window)`;
    components.push({ kind: 'mindshare', text: `Named in ${pct(ms.share)} of the ${ms.corpus}-item news window${trend}.` });
  }

  const ship = player.shipping;
  const shipBits = [];
  if (ship.github.state === 'live' && ship.github.releases_30d > 0) {
    shipBits.push(`${ship.github.is_floor ? '≥' : ''}${ship.github.releases_30d} GitHub release${ship.github.releases_30d === 1 ? '' : 's'}`);
  }
  if (ship.huggingface.state === 'live' && ship.huggingface.models_30d > 0) {
    shipBits.push(`${ship.huggingface.models_30d} Hugging Face model repo${ship.huggingface.models_30d === 1 ? '' : 's'}`);
  }
  if (ship.openrouter.state === 'live' && ship.openrouter.listed_30d > 0) {
    shipBits.push(`${ship.openrouter.listed_30d} OpenRouter listing${ship.openrouter.listed_30d === 1 ? '' : 's'}`);
  }
  if (shipBits.length) components.push({ kind: 'shipping', text: `${shipBits.join(', ')} in 30 days.` });
  else components.push({ kind: 'shipping_none', text: 'Nothing published to the three channels we watch in 30 days.' });

  const ld = player.loudness;
  if (ld.state === 'live') components.push({ kind: 'loudness', text: `${player.principal} posted ${ld.posts_30d} time${ld.posts_30d === 1 ? '' : 's'} on ${ld.feed.label} in 30 days.` });
  else if (ld.state === 'dormant') components.push({ kind: 'loudness', text: `${player.principal}'s own blog has been silent since ${ld.newest_at.slice(0, 10)}.` });

  // Fixed precedence. The first rule that fires wins, so the sentence is a pure
  // function of the numbers.
  const headline =
    (m.change_7d !== null && Math.abs(m.change_7d) >= MOVE_THRESHOLD && components.find((c) => c.kind === 'move')) ||
    (ms.delta !== null && Math.abs(ms.delta) >= MINDSHARE_THRESHOLD && components.find((c) => c.kind === 'mindshare')) ||
    components.find((c) => c.kind === 'shipping') ||
    components.find((c) => c.kind === 'shipping_none');

  if (headline) parts.push(headline.text);
  return { why: parts.join(' '), why_components: components.map((c) => c.text) };
}

async function main() {
  const startedAt = Date.now();
  assertEntityVocabulary();

  const generatedAt = new Date();
  const nowMs = generatedAt.getTime();
  const sources = [];

  /** Run one instrument. Never lets a single failure take the whole file down. */
  const run = async (id, label, fn) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      sources.push({ id, label, ok: true, state: 'live', error: null, ms: Date.now() - t0 });
      return value;
    } catch (err) {
      sources.push({ id, label, ok: false, state: 'dark', error: errMsg(err), ms: Date.now() - t0 });
      return null;
    }
  };

  const [poly, kalshi, manifold, github, hf, or, loudness, newsRead] = await Promise.all([
    run('polymarket', 'Polymarket negRisk leaderboard', collectPolymarket),
    run('kalshi', 'Kalshi KXTOPAI cross-check', collectKalshi),
    run('manifold', 'Manifold comparable-market probe', collectManifold),
    run('github-releases', 'Per-lab GitHub release baskets', () => collectGithub(nowMs)),
    run('huggingface', 'Per-lab Hugging Face model publication', () => collectHuggingFace(nowMs)),
    run('openrouter', 'OpenRouter catalogue listings', () => collectOpenRouter(nowMs)),
    run('principal-feeds', 'Principal blog feeds', () => collectLoudness(nowMs)),
    loadNews(),
  ]);

  sources.push({
    id: 'news-corpus',
    label: 'DOOMCON news corpus (data/news.json)',
    ok: newsRead.ok,
    state: newsRead.ok ? 'live' : 'dark',
    error: newsRead.ok ? null : newsRead.error,
    ms: 0,
  });
  sources.sort((a, b) => a.id.localeCompare(b.id));

  const mindshare = newsRead.ok ? computeMindshare(newsRead.news) : mindshareUnavailable(newsRead.error);

  // Every leg title the venue is live on that matches no player. Drift made
  // visible: a renamed leg shows up here instead of as a silent null on a row.
  const mappedPoly = new Set(PLAYERS.flatMap((p) => p.poly.map((a) => a.toLowerCase())));
  const mappedKalshi = new Set(PLAYERS.flatMap((p) => p.kalshi.map((a) => a.toLowerCase())));

  const players = PLAYERS.map((p) => {
    const horizonLeg = poly ? matchLeg(poly.horizon.legs, p.poly) : null;
    const spotLeg = poly ? matchLeg(poly.spot.legs, p.poly) : null;
    const kalshiLeg = kalshi ? matchLeg(kalshi.legs, p.kalshi) : null;

    const market = {
      // null when Polymarket is dark OR when the venue lists no leg. The two
      // are told apart by `state`, never merged into one ambiguous null.
      state: !poly ? 'dark' : horizonLeg ? 'live' : 'no_market',
      probability: horizonLeg ? round(horizonLeg.probability, 4) : null,
      change_7d: horizonLeg ? horizonLeg.change_7d : null,
      change_7d_state: !horizonLeg ? 'no_market' : horizonLeg.change_7d === null ? 'no_reference' : 'live',
      volume_usd: horizonLeg ? Math.round(horizonLeg.volume_usd) : null,
      leg_title: horizonLeg ? horizonLeg.title : null,
      horizon_event: poly ? { slug: poly.horizon.slug, title: poly.horizon.title, url: poly.horizon.url, end_date: poly.horizon.end_date } : null,
      spot: spotLeg
        ? {
            probability: round(spotLeg.probability, 4),
            change_7d: spotLeg.change_7d,
            leg_title: spotLeg.title,
            event: { slug: poly.spot.slug, title: poly.spot.title, url: poly.spot.url, end_date: poly.spot.end_date },
          }
        : null,
      spot_state: !poly ? 'dark' : spotLeg ? 'live' : 'no_market',
      kalshi: kalshiLeg
        ? {
            probability: round(kalshiLeg.probability, 4),
            change_24h: kalshiLeg.change_24h,
            change_24h_state: kalshiLeg.change_24h_state,
            volume_contracts: kalshiLeg.volume_contracts,
            leg_title: kalshiLeg.title,
            ticker: kalshiLeg.ticker,
            url: kalshi.url,
            question: kalshi.title,
          }
        : null,
      kalshi_state: !kalshi ? 'dark' : kalshiLeg ? 'live' : 'no_market',
    };

    return {
      id: p.id,
      name: p.name,
      principal: p.principal,
      principal_role: p.principal_role,
      principal_note: p.principal === null ? 'No single public principal. Left empty rather than filled with a plausible name.' : null,
      rank: null,
      market,
      shipping: {
        github: github ? github[p.id] : { state: 'dark', releases_30d: null, error: 'github basket did not run' },
        huggingface: hf ? hf[p.id] : { state: 'dark', models_30d: null, error: 'huggingface did not run' },
        openrouter: or ? or.per_player[p.id] : { state: 'dark', listed_30d: null, error: 'openrouter did not run' },
      },
      mindshare: mindshare.per_player[p.id],
      loudness: loudness ? loudness[p.id] : { state: 'dark', posts_30d: null, reason: 'principal feeds did not run' },
    };
  });

  // RANK. One basis, stated once: the Polymarket year-end probability.
  //
  // Not a weighted blend of probability, releases and mindshare. A blend would
  // need weights nobody can check against an outcome, and the resulting scalar
  // would be ours rather than the market's — at which point the page stops
  // being "here is what the money says" and becomes "here is our opinion,
  // dressed in arithmetic". docs/SUB-INDICES.md: never a vibes ranking.
  //
  // Players with no leg get rank null and sit in a separate group. They are
  // NOT ranked last at 0%: no market is not a low probability.
  const ranked = players.filter((p) => p.market.probability !== null)
    .sort((a, b) =>
      b.market.probability - a.market.probability ||
      (b.mindshare.share ?? 0) - (a.mindshare.share ?? 0) ||
      a.id.localeCompare(b.id));
  ranked.forEach((p, i) => { p.rank = i + 1; });

  const unranked = players.filter((p) => p.market.probability === null)
    .sort((a, b) => (b.mindshare.share ?? 0) - (a.mindshare.share ?? 0) || a.id.localeCompare(b.id));

  const leader = ranked[0] ?? null;
  if (leader) leader.runnerUp = ranked[1] ?? null;
  for (const p of [...ranked, ...unranked]) Object.assign(p, buildWhy(p, leader));
  if (leader) delete leader.runnerUp;

  const output = {
    schema: SCHEMA_VERSION,
    generated_at: generatedAt.toISOString(),
    formula_version: FORMULA_VERSION,
    ship_window_days: SHIP_WINDOW_DAYS,
    rank_basis: {
      ok: Boolean(poly),
      field: 'market.probability',
      venue: 'polymarket',
      event: poly ? { slug: poly.horizon.slug, title: poly.horizon.title, url: poly.horizon.url, end_date: poly.horizon.end_date, legs_live: poly.horizon.legs_live, legs_total: poly.horizon.legs_total, sum_of_live_legs: poly.horizon.sum_of_live_legs, volume_usd: poly.horizon.volume_usd } : null,
      statement:
        'Players are ranked by the live Polymarket probability that they hold the best AI model at the furthest-out resolution date still trading. ' +
        'This is the market’s ranking, not DOOMCON’s. Nothing on this page is a DOOMCON forecast, and none of it feeds the DOOMCON index.',
      error: poly ? null : (sources.find((s) => s.id === 'polymarket')?.error ?? 'polymarket did not run'),
    },
    markets: {
      polymarket: poly ?? { ok: false, error: sources.find((s) => s.id === 'polymarket')?.error ?? null },
      kalshi: kalshi ?? { ok: false, error: sources.find((s) => s.id === 'kalshi')?.error ?? null },
      manifold: manifold ?? { ok: false, error: sources.find((s) => s.id === 'manifold')?.error ?? null },
      unmapped_legs: {
        polymarket_horizon: poly ? poly.horizon.legs.filter((l) => !mappedPoly.has(l.title.toLowerCase())).map((l) => l.title).sort() : [],
        kalshi: kalshi ? kalshi.legs.filter((l) => !mappedKalshi.has(l.title.toLowerCase())).map((l) => l.title).sort() : [],
      },
    },
    news_window: mindshare.window,
    openrouter_catalogue: or ? { size: or.catalogue_size, alias_entries_excluded: or.alias_entries_excluded } : null,
    players: [...ranked, ...unranked],
    sources,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUTPUT_URL, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  printTable(output);

  const dark = sources.filter((s) => !s.ok);
  console.log('');
  console.log(`${sources.length - dark.length}/${sources.length} instruments live${dark.length ? `, dark: ${dark.map((s) => s.id).join(', ')}` : ''}`);
  for (const d of dark) console.log(`  dark ${d.id}: ${d.error}`);
  if (output.markets.unmapped_legs.polymarket_horizon.length) {
    console.log(`  unmapped Polymarket legs (not in the roster): ${output.markets.unmapped_legs.polymarket_horizon.join(', ')}`);
  }
  console.log(`wrote data/race.json — ${ranked.length} ranked, ${unranked.length} unranked, ${Date.now() - startedAt}ms`);

  // Non-zero only when the ranking itself could not be computed. A dark
  // shipping channel is a normal Tuesday and the file is still useful.
  if (!poly) {
    console.error('\nrace: the rank basis is dark — no ranking was produced. Exiting 1.');
    process.exitCode = 1;
  }
}

function printTable(out) {
  const ev = out.rank_basis.event;
  console.log(`\nRANK BASIS: ${ev ? `${ev.title}  (${ev.legs_live} live legs, $${ev.volume_usd.toLocaleString('en-US')}, sum ${ev.sum_of_live_legs})` : 'DARK'}`);
  if (out.markets.kalshi?.ok) console.log(`CROSS-CHECK: Kalshi ${out.markets.kalshi.series} — ${out.markets.kalshi.title} (${out.markets.kalshi.legs_live} legs)`);
  if (out.markets.manifold?.ok) console.log(`MANIFOLD: ${out.markets.manifold.included ? 'included' : 'excluded'} — ${out.markets.manifold.excluded_reason ?? ''}`);
  console.log('');
  const head = ['#', 'player', 'principal', 'market', '7d', 'kalshi', 'gh30', 'hf30', 'or30', 'mind', 'loud'];
  const w = [3, 16, 15, 8, 8, 8, 6, 6, 6, 7, 7];
  const fmt = (row) => row.map((c, i) => String(c).padEnd(w[i])).join(' ');
  console.log(fmt(head));
  console.log(w.map((n) => '-'.repeat(n)).join(' '));
  for (const p of out.players) {
    const m = p.market;
    console.log(fmt([
      p.rank ?? '—',
      p.name,
      p.principal ?? '—',
      m.probability === null ? (m.state === 'dark' ? 'DARK' : 'no mkt') : pct(m.probability, 2),
      m.change_7d === null ? (m.change_7d_state === 'no_reference' ? 'no ref' : '—') : ptSigned(m.change_7d, 2),
      m.kalshi ? pct(m.kalshi.probability, 0) : (m.kalshi_state === 'dark' ? 'DARK' : 'no mkt'),
      p.shipping.github.state === 'live' ? `${p.shipping.github.is_floor ? '≥' : ''}${p.shipping.github.releases_30d}` : p.shipping.github.state,
      p.shipping.huggingface.state === 'live' ? p.shipping.huggingface.models_30d : p.shipping.huggingface.state,
      p.shipping.openrouter.state === 'live' ? p.shipping.openrouter.listed_30d : p.shipping.openrouter.state,
      p.mindshare.share === null ? '—' : pct(p.mindshare.share, 1),
      p.loudness.state === 'live' ? `${p.loudness.posts_30d}/30d` : p.loudness.state,
    ]));
  }
  console.log('');
  for (const p of out.players) console.log(`  ${p.name}: ${p.why}`);
}

// Only run when invoked directly, so the pure helpers above can be imported by
// a test without firing forty HTTP requests as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`race: fatal — ${errMsg(err)}`);
    if (err?.stack) console.error(err.stack);
    process.exitCode = 1;
  });
}

export { PLAYERS, buildWhy, computeMindshare, readNegRiskEvent, posthavenPublishedStamps, assertEntityVocabulary };
