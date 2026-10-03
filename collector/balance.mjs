#!/usr/bin/env node
// BOTH AT ONCE — the data layer under the harm-and-benefit page.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/balance.mjs
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/balance.mjs --selftest
//
// WHY THIS EXISTS. The operator asked for the utopia case beside the doom case:
// AI solving problems on one side, AI doing harm on the other, both on one page.
// docs/BLISS.md §1 already made the argument for pairing the two directions —
// an instrument that can only say "more doom" is a hype account with a chart.
// This file is what that page stands on: two counts made by one rule, a set of
// live counters from other people's registries, and a summary of the two
// hand-curated registers in data/ledger.json.
//
// THE ONE RULE THAT SHAPES THIS FILE. Nothing here adds a harm to a benefit,
// subtracts one from the other, or divides one by the other. A fraud loss in
// dollars, a trial in patients and a count of mapped cameras share no unit,
// and an exchange rate between them would be a value judgement presented as
// arithmetic. So there is no net score, no ratio and no "on balance" anywhere
// in the output — and the only thing allowed to tip a drawn beam is a pair of
// like-for-like counts: distinct stories in ONE newsroom window, matched by ONE
// rule, against two published word lists. Not the counters, not the
// registers, not DOOMCON against BLISS. docs/BALANCE.md §3 says why.
//
// WHAT IT READS. data/news.json (the newsroom's current window), data/state.json
// (DOOMCON), data/bliss.json (BLISS), data/ledger.json (the registers), and six
// counters fetched through collector/fetch.mjs by the adapters in
// collector/balance-sources/. WHAT IT WRITES. data/balance.json, and nothing in
// public/: site/build.mjs clears that directory before it regenerates.
//
// DETERMINISM. generated_at is the newest timestamp among the inputs, never the
// clock, and the counters' window is anchored on that day. Two runs over the
// same inputs and the same counter answers write byte-identical files
// (CONTRACT.md hard constraint 4). The clock is read only for the log's timings.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { fetchJson, fetchText } from './fetch.mjs';
import { wordSequence, clusterTitle } from './news-stories.mjs';
import { canonical } from './dc-sources/_util.mjs';
import { canonicalJson } from './receipts.mjs';

export const BALANCE_SCHEMA = 1;
export const BALANCE_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// The lexicon, v5, exactly as verified on 2026-09-28. Surface forms, not stems,
// for the reason collector/news-stories.mjs gives at SEVERITY_TERMS: stemming
// "hackers" to "hacker" made the words "Hacker News" fire in every hn-ai
// summary. Every term is one to four words in wordSequence() form.
//
// ANY EDIT TO EITHER LIST IS A NEW INSTRUMENT. The precision figures below were
// measured on these exact lists, and a count made with a different list is not
// comparable with one made with this. Change LEXICON_VERSION with the lists.
// ---------------------------------------------------------------------------

export const LEXICON_VERSION = 'v5';

export const HARM_TERMS = Object.freeze([
  'harm', 'harms', 'harmed', 'harmful', 'rogue', 'incident', 'incidents',
  'breach', 'breached', 'breaches', 'hacked', 'hacking',
  'tried to hack', 'attempted to hack', 'attempts to hack', 'attempting to hack',
  'attack', 'attacks', 'attacked', 'attacking', 'exploit', 'exploits', 'exploited',
  'compromised', 'unauthorized', 'unauthorised', 'leak', 'leaks', 'leaked', 'leaking',
  'lawsuit', 'lawsuits', 'sued', 'sues', 'suing', 'scam', 'scams', 'scammer', 'scammers',
  'fraud', 'fraudulent', 'deceptive', 'deepfake', 'deepfakes', 'abuse', 'abused', 'abusive',
  'misinformation', 'disinformation', 'lethal',
  'weaponise', 'weaponises', 'weaponised', 'weaponize', 'weaponizes', 'weaponized',
  'catastrophic', 'killed', 'deaths', 'layoffs', 'laid off', 'job cuts',
  'infringes', 'infringement', 'infringing', 'malware', 'ransomware', 'phishing',
  'jailbreak', 'jailbreaks', 'jailbroken', 'stolen', 'misuse', 'misused',
  'without consent', 'without permission', 'fined', 'fines',
]);

export const BENEFIT_TERMS = Object.freeze([
  'cure', 'cures', 'cured', 'diagnose', 'diagnosed', 'diagnosis', 'diagnoses',
  'cancer', 'tumor', 'tumour', 'tumors', 'tumours', 'disease', 'diseases',
  'lifesaving', 'life saving', 'save lives', 'saved lives', 'saves lives',
  'antibiotic', 'antibiotics', 'vaccine', 'vaccines', 'antibody', 'antibodies',
  'enzyme', 'enzymes', 'protein', 'proteins', 'accessibility', 'visually impaired',
  'deaf', 'hearing loss', 'hard of hearing', 'fda cleared', 'fda clearance',
  'fda approved', 'fda approval', 'early detection', 'wildfire detection',
  'flood forecasting', 'early warning', 'civilian defense', 'civilian defence',
  'sign language', 'drug candidate', 'drug candidates',
]);

// A headline carrying one of these is discussing a harm or a benefit, not
// reporting one, and counts on neither side. "may" is deliberately absent: it
// is also the month. "q a" is how wordSequence() spells "Q&A".
export const HEDGE_TERMS = Object.freeze([
  'risk', 'risks', 'warns', 'warned', 'warning', 'warnings', 'could', 'might', 'would',
  'q a', 'interview', 'podcast', 'opinion',
]);

// A hit is ignored when one of these stands one or two words before it.
// 'There are no "rogue" AI agents' is a denial, and a lexicon cannot read it
// any other way.
export const NEGATORS = Object.freeze(['no', 'not', 'never']);
export const NEGATION_REACH = 2;

// Vendor blogs never report their own harms and always report their own
// benefits, and arXiv abstracts discuss attacks as subject matter. None of
// these kinds is scanned.
export const NOT_SCANNED_KINDS = Object.freeze(['paper', 'lab', 'release', 'model']);

export const RULE = Object.freeze({
  TITLE_MIN_HITS: 1,
  SUMMARY_MIN_DISTINCT_HITS: 2,
  MAX_TERM_WORDS: 4,
});

// What changed from v4, so a reader sees what did not survive checking.
export const DROPPED_FROM_V4 = Object.freeze({
  harm: Object.freeze([
    'harassed', 'harassment', 'addiction', 'theft', 'endanger', 'endangers', 'endangering',
    'spying', 'surveillance', 'ai weapons', 'autonomous weapons',
  ]),
  benefit: Object.freeze(['heal', 'heals', 'healed']),
});

// The v5 in-sample measurements, as verified. Published with the lists because
// a precision figure that does not travel with its list is a claim about some
// other list.
export const LEXICON_MEASURED = Object.freeze({
  sample:
    'data/news.json generated_at 2026-09-28T02:46:46.998Z (200 items, 85 non-paper), plus every distinct item in ' +
    'its 483 git revisions (757 items, 324 non-paper)',
  labels:
    'One labeller. An item counts as Y only if it reports something that happened; commentary about what has ' +
    'not happened is not harm, and funding rounds and vendor self-announcements are not benefit.',
  harm_current_file: { matched: 11, y: 11, precision_strict_pct: 100, wilson_95_lower_pct: 74.1, known_y_found: '11 of 16' },
  harm_all_history: {
    matched: 26, y: 23, borderline: 2, n: 1,
    precision_strict_pct: 88.5, wilson_95_pct: [71.0, 96.0], precision_counting_borderline_pct: 96.2,
    known_y_found: '23 of 34',
  },
  benefit_all_history: { matched: 2, y: 2, precision_strict_pct: 100, wilson_95_lower_pct: 34.2, known_y_found: '2 of 4' },
  benefit_current_file: { matched: 0 },
  matched_both_lists: 0,
  in_sample: true,
});

// ---------------------------------------------------------------------------
// The beam. The only thing allowed to tilt it is harm-only stories against
// benefit-only stories in one newsroom window. See docs/BALANCE.md §4.
// ---------------------------------------------------------------------------

export const BEAM = Object.freeze({
  MAX_DEG: 8,        // the steepest tilt, reached when one pan is empty
  DEADBAND: 2,       // |H - B| at or below this draws the beam level
  MIN_TAGGED: 5,     // H + B below this draws the beam level
});

// The counters' window: the 30 whole UTC days before the anchor day, plus the
// anchor day so far. Kept identical to the verified runs (2026-08-29 to
// 2026-09-28), so a counter published here can be checked against them.
export const COUNTER_DAYS_BACK = 30;

// The slowest adapter reads a 5.7 MB file with a 120 s fetch timeout. The
// watchdog sits above that, so it only ever fires on a wedged adapter.
const COUNTER_WATCHDOG_MS = 150_000;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Matching. Pure — no clock, no I/O.
// ---------------------------------------------------------------------------

/** term list -> Map(first word -> [{term, words}]). Throws on a malformed list. */
export function compileTerms(list, name) {
  const byFirst = new Map();
  const seen = new Set();
  for (const term of list) {
    const words = wordSequence(term);
    // A term not already in wordSequence() form would silently never match.
    if (words.join(' ') !== term) throw new Error(`${name}: "${term}" is not in wordSequence() form`);
    if (words.length < 1 || words.length > RULE.MAX_TERM_WORDS) throw new Error(`${name}: "${term}" is not 1 to ${RULE.MAX_TERM_WORDS} words`);
    if (seen.has(term)) throw new Error(`${name}: "${term}" is listed twice`);
    seen.add(term);
    if (!byFirst.has(words[0])) byFirst.set(words[0], []);
    byFirst.get(words[0]).push({ term, words });
  }
  return byFirst;
}

const COMPILED = Object.freeze({
  harm: compileTerms(HARM_TERMS, 'HARM_TERMS'),
  benefit: compileTerms(BENEFIT_TERMS, 'BENEFIT_TERMS'),
  hedge: compileTerms(HEDGE_TERMS, 'HEDGE_TERMS'),
});

for (const t of HARM_TERMS) {
  // One word on both lists would make every item carrying it "both" by
  // construction, which is a fact about the lists, not about the story.
  if (BENEFIT_TERMS.includes(t)) throw new Error(`"${t}" is on both lists`);
}

/** Every occurrence of every term in a word sequence: [{term, at}]. */
export function scanWords(words, compiled) {
  const hits = [];
  for (let i = 0; i < words.length; i++) {
    for (const t of compiled.get(words[i]) ?? []) {
      if (i + t.words.length > words.length) continue;
      let ok = true;
      for (let k = 1; k < t.words.length; k++) if (words[i + k] !== t.words[k]) { ok = false; break; }
      if (ok) hits.push({ term: t.term, at: i });
    }
  }
  return hits;
}

/** The negator standing within NEGATION_REACH words before position `at`, or null. */
export function negatorBefore(words, at) {
  for (let k = 1; k <= NEGATION_REACH && at - k >= 0; k++) {
    if (NEGATORS.includes(words[at - k])) return words[at - k];
  }
  return null;
}

/**
 * Is the headline discussing rather than reporting? A title ending in "?" — a
 * trailing source credit such as "(Jane Doe/Wired)" is allowed after it — or a
 * title carrying a hedge word. Returns null, or what fired.
 */
export function hedgeOf(title) {
  const t = String(title ?? '').trim();
  if (t.endsWith('?') || clusterTitle(t).trim().endsWith('?')) return 'question';
  const hit = scanWords(wordSequence(t), COMPILED.hedge)[0];
  return hit ? hit.term : null;
}

function sideHits(titleWords, summaryWords, compiled, negated) {
  const out = { title: [], summary: [] };
  for (const [field, words] of [['title', titleWords], ['summary', summaryWords]]) {
    const terms = new Set();
    for (const h of scanWords(words, compiled)) {
      const by = negatorBefore(words, h.at);
      if (by) negated.push({ term: h.term, field, by });
      else terms.add(h.term);
    }
    out[field] = [...terms].sort();
  }
  return out;
}

/**
 * One newsroom item -> its tag under the v5 rule.
 *
 *   1. kinds in NOT_SCANNED_KINDS are not scanned at all.
 *   2. a question headline, or a hedge word in the headline: neither side.
 *   3. a hit with no/not/never one or two words before it is ignored.
 *   4. a side counts if the headline has >= 1 hit, or the summary has >= 2
 *      DISTINCT hits.
 *
 * The same rule for both sides, applied in the same pass. That symmetry is the
 * whole claim: a rule that let warnings count as harm while hype did not count
 * as benefit would tilt every comparison before a single headline was read.
 */
export function classifyItem(item) {
  if (NOT_SCANNED_KINDS.includes(item?.kind)) return { scanned: false };
  const titleWords = wordSequence(item.title ?? '');
  const summaryWords = wordSequence(item.summary ?? '');
  const negated = [];
  const hits = {
    harm: sideHits(titleWords, summaryWords, COMPILED.harm, negated),
    benefit: sideHits(titleWords, summaryWords, COMPILED.benefit, negated),
  };
  const hedge = hedgeOf(item.title);
  const qualifies = (h) => h.title.length >= RULE.TITLE_MIN_HITS || h.summary.length >= RULE.SUMMARY_MIN_DISTINCT_HITS;
  const harm = !hedge && qualifies(hits.harm);
  const benefit = !hedge && qualifies(hits.benefit);
  const tag = harm && benefit ? 'both' : harm ? 'harm' : benefit ? 'benefit' : 'neither';

  // For the audit list: why an item with evidence on it still landed in neither.
  let setAside = null;
  const anyHit = ['harm', 'benefit'].some((s) => hits[s].title.length + hits[s].summary.length > 0);
  if (tag === 'neither') {
    if (anyHit && hedge === 'question') setAside = 'the headline is a question';
    else if (anyHit && hedge) setAside = `hedge word "${hedge}" in the headline`;
    else if (anyHit) setAside = `one distinct summary hit; the rule needs ${RULE.SUMMARY_MIN_DISTINCT_HITS}`;
    else if (negated.length) setAside = 'every hit is negated';
  }
  negated.sort((a, b) => a.field.localeCompare(b.field) || a.term.localeCompare(b.term) || a.by.localeCompare(b.by));
  return { scanned: true, tag, hits, negated, hedge, set_aside: setAside };
}

// ---------------------------------------------------------------------------
// The newsroom window -> counts by item and by distinct story, and the beam.
// ---------------------------------------------------------------------------

function emptyCounts() {
  return { scanned: 0, harm_only: 0, benefit_only: 0, both: 0, neither: 0, harm_list: 0, benefit_list: 0 };
}

function tally(counts, tag) {
  counts.scanned += 1;
  if (tag === 'harm') counts.harm_only += 1;
  else if (tag === 'benefit') counts.benefit_only += 1;
  else if (tag === 'both') counts.both += 1;
  else counts.neither += 1;
  if (tag === 'harm' || tag === 'both') counts.harm_list += 1;
  if (tag === 'benefit' || tag === 'both') counts.benefit_list += 1;
}

const round2 = (x) => Math.round(x * 100) / 100;
const round1 = (x) => Math.round(x * 10) / 10;

/**
 * H harm-only stories, B benefit-only stories -> the drawn beam.
 * A story on both lists sits at the fulcrum and moves neither pan. The angle
 * is a drawing instruction, not a figure: the page prints the two counts and
 * never their difference or their ratio.
 */
export function beamFor(H, B) {
  if (!Number.isInteger(H) || !Number.isInteger(B) || H < 0 || B < 0) {
    throw new Error(`beamFor: counts must be non-negative integers, got ${H}, ${B}`);
  }
  let level = null;
  if (H + B < BEAM.MIN_TAGGED) level = `fewer than ${BEAM.MIN_TAGGED} stories matched one list only`;
  else if (Math.abs(H - B) <= BEAM.DEADBAND) level = `the two counts are within ${BEAM.DEADBAND} of each other`;
  if (level) return { level: true, level_reason: level, sinks: null, angle_deg: 0 };
  const angle = Math.min(BEAM.MAX_DEG, (BEAM.MAX_DEG * Math.abs(H - B)) / (H + B));
  return { level: false, level_reason: null, sinks: H > B ? 'harm' : 'benefit', angle_deg: round2(angle) };
}

function itemRecord(item, c, storyKey) {
  return {
    id: item.id ?? null,
    title: item.title ?? null,
    url: item.url ?? null,
    source: item.source ?? null,
    kind: item.kind ?? null,
    published_at: item.published_at ?? null,
    score: Number.isFinite(item.score) ? item.score : null,
    story: storyKey,
    tag: c.tag,
    hits: c.hits,
    negated: c.negated,
    hedge: c.hedge,
    set_aside: c.set_aside,
  };
}

function byNewest(a, b) {
  return String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')) || String(a.id).localeCompare(String(b.id));
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "02:46 UTC on Mon 28 Sep 2026". Fixed tables, never toLocaleString(). */
export function utcStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`utcStamp: bad timestamp ${iso}`);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC on ${DOW[d.getUTCDay()]} ${p(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** data/news.json -> the newsroom block. Pure. `news` null means the file was absent or unreadable. */
export function newsroomBlock(news, { error = null } = {}) {
  if (!news || !Array.isArray(news.items)) {
    return {
      state: 'dark',
      error: error ?? 'data/news.json is absent or has no items array',
      generated_at: news?.generated_at ?? null,
      items: null, stories: null, matched: null, neither: null, sentence: null,
      beam: { state: 'dark', level: true, level_reason: 'no newsroom window to count', sinks: null, angle_deg: 0, harm: null, benefit: null, both: null, neither: null, scanned: null },
    };
  }

  const storyOf = new Map();
  for (const s of news.stories ?? []) for (const m of s.members ?? []) storyOf.set(m, s.id);

  const items = emptyCounts();
  const notScanned = {};
  const storyTags = new Map(); // story key -> { harm, benefit }
  const matched = { harm: [], benefit: [] };
  const neither = [];
  let hedged = 0;
  let first = null;
  let last = null;

  for (const item of news.items) {
    const t = item.published_at;
    if (typeof t === 'string') {
      if (first === null || t < first) first = t;
      if (last === null || t > last) last = t;
    }
    const c = classifyItem(item);
    if (!c.scanned) {
      notScanned[item.kind] = (notScanned[item.kind] ?? 0) + 1;
      continue;
    }
    const key = storyOf.get(item.id) ?? `item:${item.id}`;
    tally(items, c.tag);
    if (c.hedge) hedged += 1;
    const st = storyTags.get(key) ?? { harm: false, benefit: false };
    if (c.tag === 'harm' || c.tag === 'both') st.harm = true;
    if (c.tag === 'benefit' || c.tag === 'both') st.benefit = true;
    storyTags.set(key, st);

    const rec = itemRecord(item, c, storyOf.get(item.id) ?? null);
    if (c.tag === 'harm' || c.tag === 'both') matched.harm.push(rec);
    if (c.tag === 'benefit' || c.tag === 'both') matched.benefit.push(rec);
    if (c.tag === 'neither') neither.push(rec);
  }

  // A story is on a list when any of its scanned headlines is. One cluster
  // counts once, so three outlets syndicating one event cannot fill a pan three
  // times (the unit the beam tilts on).
  const stories = emptyCounts();
  for (const st of storyTags.values()) {
    tally(stories, st.harm && st.benefit ? 'both' : st.harm ? 'harm' : st.benefit ? 'benefit' : 'neither');
  }

  matched.harm.sort(byNewest);
  matched.benefit.sort(byNewest);
  neither.sort(byNewest);

  const b = beamFor(stories.harm_only, stories.benefit_only);
  const notScannedTotal = Object.values(notScanned).reduce((s, n) => s + n, 0);
  const spanHours = first && last ? round1((Date.parse(last) - Date.parse(first)) / 3_600_000) : null;

  return {
    state: 'live',
    error: null,
    generated_at: news.generated_at ?? null,
    window: {
      nominal_days: news.window_days ?? null,
      max_items: news.max_items ?? null,
      first_published_at: first,
      last_published_at: last,
      // The 200-item cap, not the nominal 7 days, sets the real span, and it
      // moves with how busy the news is. Any series built from these counts
      // has to use shares of `scanned`, never raw counts.
      span_hours: spanHours,
    },
    items_in_window: news.items.length,
    not_scanned: { total: notScannedTotal, by_kind: notScanned },
    // Scanned items whose headline tripped the hedge rule, hits or not.
    items: { ...items, hedged_headlines: hedged },
    stories,
    beam: {
      state: 'live',
      unit: 'distinct stories',
      harm: stories.harm_only,
      benefit: stories.benefit_only,
      both: stories.both,
      neither: stories.neither,
      scanned: stories.scanned,
      ...b,
    },
    matched,
    neither,
    // Computed here, beside the counts, so no template can print one count
    // without the other or without the denominator. A benefit count of 0 is a
    // measured zero: the list exists and was applied.
    sentence: Number.isNaN(Date.parse(news.generated_at ?? ''))
      ? null
      : `${stories.harm_list} of ${stories.scanned} stories in the newsroom's current window matched the harm list and ` +
        `${stories.benefit_list} matched the benefit list, as of ${utcStamp(news.generated_at)}. A count of words, not of outcomes.`,
  };
}

// ---------------------------------------------------------------------------
// DOOMCON and BLISS, as context. Read, never combined.
// ---------------------------------------------------------------------------

/** state.json / bliss.json -> a context reading in the site's three states. Pure. */
export function indexBlock(name, doc, { error = null } = {}) {
  if (!doc) {
    return { index: name, state: 'dark', error: error ?? `no ${name} reading on disk`, score: null, level: null, level_name: null, generated_at: null };
  }
  const score = Number.isFinite(doc.score) ? doc.score : null;
  const base = {
    index: name,
    generated_at: doc.generated_at ?? null,
    score,
    level: Number.isInteger(doc.level) ? doc.level : null,
    level_name: doc.level_name ?? null,
    degraded: doc.degraded === true,
  };
  if (name === 'BLISS') {
    // Posture is BLISS's own verdict on why there is or is not a number
    // (collector/bliss.mjs). An absent baseline is not an outage and is never
    // printed as one — nor as a number it does not have.
    const posture = doc.posture ?? (score === null ? 'dark' : 'live');
    return {
      ...base,
      state: posture === 'awaiting-baseline' ? 'awaiting-baseline' : score === null ? 'dark' : 'live',
      error: null,
      posture,
      sources_reporting: Number.isInteger(doc.sources_reporting) ? doc.sources_reporting : null,
      sources_total: Number.isInteger(doc.sources_total) ? doc.sources_total : null,
      failed_sources: Array.isArray(doc.failed_sources) ? doc.failed_sources : [],
      printed_as: posture === 'awaiting-baseline' ? 'awaiting baseline' : score === null ? 'dark' : 'score',
    };
  }
  return {
    ...base,
    state: score === null ? 'dark' : 'live',
    error: score === null ? 'state.json carries no score' : null,
    dark_pillars: Array.isArray(doc.dark_pillars) ? doc.dark_pillars : [],
    printed_as: score === null ? 'dark' : 'score',
  };
}

// ---------------------------------------------------------------------------
// The registers. data/ledger.json is hand-curated; this checks it rather than
// trusting it, so a hand edit that breaks a total or a status is caught here.
// ---------------------------------------------------------------------------

const LEDGER_STATUS_SIDES = ['benefit', 'harm'];
const CONFIDENCE = ['verified', 'probable'];
const ROW_TEXT_FIELDS = ['id', 'domain', 'title', 'status', 'what_is_measured', 'what_is_claimed', 'confidence', 'caveat'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function serialise(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

/** Recomputed totals for one side. */
export function sideTotals(rows, words) {
  const by_status = Object.fromEntries(Object.keys(words).map((k) => [k, 0]));
  const by_confidence = {};
  let numbers = 0;
  for (const r of rows) {
    by_status[r.status] += 1;
    by_confidence[r.confidence] = (by_confidence[r.confidence] ?? 0) + 1;
    numbers += r.numbers.length;
  }
  return { rows: rows.length, by_status, by_confidence, numbers };
}

/** Throws with every problem found, or returns the summary. `text` is the file as read. */
export function checkLedger(ledger, text) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (ledger?.schema !== 1) bad(`schema is ${JSON.stringify(ledger?.schema)}, expected 1`);
  if (!ISO_DAY.test(ledger?.as_of_date ?? '')) bad(`as_of_date ${JSON.stringify(ledger?.as_of_date)} is not YYYY-MM-DD`);
  const ids = new Set();
  const rowIds = new Set();
  for (const side of LEDGER_STATUS_SIDES) {
    const words = ledger?.status_words?.[side];
    if (!words || typeof words !== 'object') { bad(`status_words.${side} is missing`); continue; }
    const rows = ledger[side];
    if (!Array.isArray(rows) || rows.length === 0) { bad(`${side}[] is missing or empty`); continue; }
    rows.forEach((r, i) => {
      const at = `${side}[${i}]${r?.id ? ` (${r.id})` : ''}`;
      for (const f of ROW_TEXT_FIELDS) if (typeof r?.[f] !== 'string' || !r[f].trim()) bad(`${at}: ${f} is missing`);
      if (r?.side !== side) bad(`${at}: side is ${JSON.stringify(r?.side)}, filed under ${side}`);
      if (r?.status && !Object.hasOwn(words, r.status)) bad(`${at}: status "${r.status}" is not one of ${Object.keys(words).join(', ')}`);
      if (r?.confidence && !CONFIDENCE.includes(r.confidence)) bad(`${at}: confidence "${r.confidence}" is not one of ${CONFIDENCE.join(', ')}`);
      if (!ISO_DAY.test(r?.as_of ?? '')) bad(`${at}: as_of is not YYYY-MM-DD`);
      if (!Array.isArray(r?.sources) || r.sources.length === 0 || r.sources.some((u) => !/^https:\/\//.test(u))) bad(`${at}: sources must be a non-empty list of https URLs`);
      if (!Array.isArray(r?.numbers) || r.numbers.length === 0) bad(`${at}: numbers[] is missing or empty`);
      else r.numbers.forEach((n, k) => {
        // A number without its source is exactly what this register exists not to print.
        if (typeof n?.value !== 'string' || typeof n?.unit !== 'string' || !/^https:\/\//.test(n?.source_url ?? '')) bad(`${at}: numbers[${k}] needs value, unit and an https source_url`);
      });
      if (r?.id) {
        if (ids.has(r.id)) bad(`${at}: id "${r.id}" is used twice`);
        ids.add(r.id);
        rowIds.add(r.id);
      }
    });
  }
  for (const [list, need] of [['dropped', ['id', 'side', 'item', 'reason', 'noted_in']], ['retired', ['id', 'side', 'reason', 'retired_on']]]) {
    if (!Array.isArray(ledger?.[list])) { bad(`${list}[] is missing`); continue; }
    ledger[list].forEach((d, i) => {
      for (const f of need) if (typeof d?.[f] !== 'string' || !d[f].trim()) bad(`${list}[${i}]: ${f} is missing`);
      // A retired id stays retired: reusing it would silently re-point old links.
      if (d?.id) { if (ids.has(d.id)) bad(`${list}[${i}]: id "${d.id}" is already in use`); ids.add(d.id); }
      if (list === 'dropped' && d?.noted_in && !rowIds.has(d.noted_in)) bad(`dropped[${i}]: noted_in "${d.noted_in}" is not a row`);
    });
  }
  if (problems.length === 0) {
    const want = Object.fromEntries(LEDGER_STATUS_SIDES.map((s) => [s, sideTotals(ledger[s], ledger.status_words[s])]));
    if (canonicalJson(want) !== canonicalJson(ledger.totals ?? null)) {
      bad(`totals do not match the rows: file says ${canonicalJson(ledger.totals ?? null)}, rows give ${canonicalJson(want)}`);
    }
    if (typeof text === 'string' && text !== serialise(ledger)) {
      bad('the file is not canonical (keys sorted at every level, two-space indent, one trailing newline); regenerate it rather than hand-format it');
    }
  }
  if (problems.length) throw new Error(`data/ledger.json: ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  return {
    as_of_date: ledger.as_of_date,
    rows: { benefit: ledger.benefit.length, harm: ledger.harm.length },
    totals: ledger.totals,
    dropped: ledger.dropped.length,
    retired: ledger.retired.length,
  };
}

export function ledgerBlock(ledger, text, { error = null } = {}) {
  const sha256 = typeof text === 'string' ? `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}` : null;
  if (!ledger) return { state: 'invalid', error: error ?? 'data/ledger.json is absent', file: 'data/ledger.json', sha256 };
  try {
    return { state: 'valid', error: null, file: 'data/ledger.json', sha256, ...checkLedger(ledger, text) };
  } catch (err) {
    return { state: 'invalid', error: err.message, file: 'data/ledger.json', sha256 };
  }
}

// ---------------------------------------------------------------------------
// The counters. Same paranoia as collector/bliss.mjs: a counter that failed is
// in the output AS a failure, never omitted, never zeroed, never carried over.
// ---------------------------------------------------------------------------

const SOURCES_DIR = new URL('./balance-sources/', import.meta.url);
const VALID_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SIDES = ['harm', 'benefit'];

async function discoverAdapters() {
  const files = (await readdir(SOURCES_DIR))
    .filter((n) => n.endsWith('.mjs') && !n.startsWith('_') && !n.startsWith('.'))
    .sort();
  if (files.length === 0) throw new Error('balance: no adapters in collector/balance-sources/');
  const adapters = [];
  const seen = new Set();
  for (const file of files) {
    // An adapter that will not import is a code error, not a data outage, and
    // it is fatal for the run: its side is unknowable, so it cannot be reported
    // dark on the right side (the same call collect.mjs and bliss.mjs make).
    let mod;
    try { mod = await import(new URL(file, SOURCES_DIR).href); } catch (err) {
      throw new Error(`balance: adapter ${file} failed to import — ${err.message}`);
    }
    adapters.push(validateAdapter(mod.default, file));
    if (seen.has(mod.default.id)) throw new Error(`balance: duplicate counter id "${mod.default.id}" in ${file}`);
    seen.add(mod.default.id);
  }
  return adapters.sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side) || a.id.localeCompare(b.id));
}

export function validateAdapter(a, file = '(inline)') {
  if (!a || typeof a !== 'object') throw new Error(`balance: ${file} has no default-exported object`);
  if (typeof a.id !== 'string' || !VALID_ID.test(a.id)) throw new Error(`balance: ${file} has invalid id ${JSON.stringify(a.id)}`);
  if (!SIDES.includes(a.side)) throw new Error(`balance: ${file} has side ${JSON.stringify(a.side)}, want harm or benefit`);
  for (const f of ['label', 'endpoint', 'counts', 'does_not_count']) {
    if (typeof a[f] !== 'string' || !a[f]) throw new Error(`balance: ${file} has no ${f}`);
  }
  for (const f of ['keyless', 'windowed', 'ai_specific', 'context_only']) {
    if (typeof a[f] !== 'boolean') throw new Error(`balance: ${file} must say ${f} as true or false`);
  }
  if (typeof a.collect !== 'function') throw new Error(`balance: ${file} has no collect()`);
  return a;
}

function errorMessage(err) {
  return err instanceof Error ? (err.message || err.name) : String(err);
}

function withTimeout(promise, ms, id) {
  let timer;
  const watchdog = new Promise((_res, rej) => {
    // Not unref()'d: an adapter wedged on a promise that holds no socket would
    // otherwise let Node exit mid-run with no file written and no error. The
    // finally below clears the timer on every other path.
    timer = setTimeout(() => rej(new Error(`${id}: timed out after ${ms}ms`)), ms);
  });
  // The loser of the race must not reject unobserved and crash the run.
  promise.catch(() => {});
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timer));
}

/** One adapter -> one published record. Never throws. `ms` is log telemetry only. */
export async function runCounter(adapter, net, window, { watchdogMs = COUNTER_WATCHDOG_MS, clock = () => Date.now() } = {}) {
  const t0 = clock();
  const base = {
    id: adapter.id,
    side: adapter.side,
    label: adapter.label,
    endpoint: adapter.endpoint,
    keyless: adapter.keyless,
    windowed: adapter.windowed,
    ai_specific: adapter.ai_specific,
    context_only: adapter.context_only,
    counts: adapter.counts,
    does_not_count: adapter.does_not_count,
    window: adapter.windowed ? { from: window.from, to: window.to } : null,
  };
  const dark = (message) => ({ record: { ...base, state: 'dark', value: null, unit: null, error: message, meta: {} }, ms: clock() - t0 });
  let r;
  try {
    r = await withTimeout(Promise.resolve().then(() => adapter.collect(net, window)), watchdogMs, adapter.id);
  } catch (err) {
    return dark(errorMessage(err));
  }
  // typeof, not Number(): Number(null) === 0 is the silent zero this file exists
  // to refuse. A counter that lost its value is dark, not a quiet day.
  if (!r || typeof r.value !== 'number' || !Number.isFinite(r.value)) {
    return dark(`adapter returned a non-finite value (${JSON.stringify(r?.value)})`);
  }
  return {
    record: {
      ...base,
      state: 'live',
      value: r.value,
      unit: typeof r.unit === 'string' ? r.unit : null,
      error: null,
      meta: r.meta && typeof r.meta === 'object' ? r.meta : {},
    },
    ms: clock() - t0,
  };
}

/** Counters' window from the anchor timestamp: [anchor day - 30, anchor day], UTC, inclusive. */
export function counterWindow(anchorIso) {
  const t = Date.parse(anchorIso);
  if (Number.isNaN(t)) throw new Error(`counterWindow: bad anchor ${anchorIso}`);
  const to = new Date(t).toISOString().slice(0, 10);
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - COUNTER_DAYS_BACK * DAY_MS).toISOString().slice(0, 10);
  return { from, to };
}

/** The newest of the inputs' own timestamps. Never the clock. */
export function newestTimestamp(stamps) {
  let best = null;
  for (const s of stamps) {
    if (typeof s !== 'string') continue;
    const t = Date.parse(s);
    if (Number.isNaN(t)) continue;
    if (best === null || t > best.t) best = { t, s: new Date(t).toISOString() };
  }
  return best ? best.s : null;
}

// ---------------------------------------------------------------------------
// Assembly. Pure: same inputs, same object, same bytes.
// ---------------------------------------------------------------------------

export const HONESTY = Object.freeze([
  'No net score. Nothing in this file adds a harm to a benefit, subtracts one from the other or divides one by the other, because the two sides share no unit.',
  'The beam compares two counts made by one rule over one set of headlines: distinct stories in the newsroom\'s current window that matched the harm list only, against those that matched the benefit list only. It moves on nothing else.',
  'A headline count is a count of words, not of outcomes. The stories that match neither list are counted and published beside the other two every time, so the two pans never pose as the whole newsroom.',
  'Each counter is published as its publisher reports it, in its own unit and window. A counter that failed is dark, with its error, and never a zero.',
  'DOOMCON and BLISS are printed as context and never compared here. A BLISS with no frozen reference is printed as awaiting baseline, never as a number.',
]);

export function buildBalance({ news, newsError = null, state, stateError = null, bliss, blissError = null, ledger, ledgerText, ledgerError = null, counters, window, generatedAt }) {
  if (typeof generatedAt !== 'string') throw new Error('buildBalance: generatedAt is required');
  const newsroom = newsroomBlock(news, { error: newsError });
  const bySide = { harm: [], benefit: [] };
  for (const c of counters) bySide[c.side].push(c);
  for (const s of SIDES) bySide[s].sort((a, b) => a.id.localeCompare(b.id));
  const live = counters.filter((c) => c.state === 'live').length;

  return {
    schema: BALANCE_SCHEMA,
    balance_version: BALANCE_VERSION,
    generated_at: generatedAt,
    generated_at_rule: 'the newest timestamp among the inputs (news, DOOMCON, BLISS, ledger as_of_date), never the clock',
    honesty: HONESTY,
    newsroom,
    lexicon: {
      version: LEXICON_VERSION,
      harm_terms: HARM_TERMS,
      benefit_terms: BENEFIT_TERMS,
      sizes: { harm: HARM_TERMS.length, benefit: BENEFIT_TERMS.length },
      hedge_terms: HEDGE_TERMS,
      negators: NEGATORS,
      negation_reach_words: NEGATION_REACH,
      not_scanned_kinds: NOT_SCANNED_KINDS,
      rule: {
        matching: 'exact word forms after lower-casing, accent-folding and splitting on anything that is not a letter or a digit (wordSequence in collector/news-stories.mjs); phrases of 1 to 4 consecutive words; no stemming',
        title_min_hits: RULE.TITLE_MIN_HITS,
        summary_min_distinct_hits: RULE.SUMMARY_MIN_DISTINCT_HITS,
        hedge: 'a headline ending in "?" (a trailing credit in parentheses allowed after it), or carrying a hedge term, counts on neither side',
        negation: `a hit with ${NEGATORS.join(', ')} up to ${NEGATION_REACH} words before it is ignored`,
        same_rule_both_sides: true,
      },
      dropped_from_v4: DROPPED_FROM_V4,
      measured: LEXICON_MEASURED,
    },
    counters: {
      window: { from: window.from, to: window.to, days_back: COUNTER_DAYS_BACK, anchor: generatedAt },
      window_rule: `the ${COUNTER_DAYS_BACK} whole UTC days before the anchor day plus the anchor day so far, both ends inclusive; the anchor is generated_at`,
      live,
      dark: counters.length - live,
      harm: bySide.harm,
      benefit: bySide.benefit,
      never_summed: true,
    },
    ledger: ledgerBlock(ledger, ledgerText, { error: ledgerError }),
    indices: {
      note: 'Context only. Neither index feeds the beam, and the two are never subtracted, compared or combined in this file.',
      doomcon: indexBlock('DOOMCON', state, { error: stateError }),
      bliss: indexBlock('BLISS', bliss, { error: blissError }),
    },
    beam_rule: {
      tilts_on: 'newsroom.beam.harm against newsroom.beam.benefit: distinct stories matching one list only, in one window, by one rule',
      never_on: [
        'the counters', 'the registers in data/ledger.json', 'DOOMCON against BLISS',
        'severity tiers, item scores, recency, corroboration or engagement', 'counts from different windows or source sets',
        'any language-model or sentiment judgement',
      ],
      angle: `angle = ${BEAM.MAX_DEG} x |H - B| / (H + B) degrees, clamped to ${BEAM.MAX_DEG}, heavier pan down`,
      level_when: `|H - B| <= ${BEAM.DEADBAND} or H + B < ${BEAM.MIN_TAGGED}`,
      constants: { max_deg: BEAM.MAX_DEG, deadband: BEAM.DEADBAND, min_tagged: BEAM.MIN_TAGGED },
      print: 'the two counts, large; never their difference or their ratio as a number',
      both_lists: 'a story on both lists sits at the fulcrum and moves neither pan',
    },
  };
}

// ---------------------------------------------------------------------------
// I/O shell
// ---------------------------------------------------------------------------

const ROOT = new URL('../', import.meta.url);

function parseArgs(argv) {
  const out = { data: 'data', out: null, quiet: false, dryRun: false, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') { out.data = argv[++i]; }
    else if (a === '--out') { out.out = argv[++i]; }
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--selftest') out.selftest = true;
    else throw new Error(`balance: unknown argument "${a}". Usage: node collector/balance.mjs [--data DIR] [--out FILE] [--quiet] [--dry-run] [--selftest]`);
  }
  return out;
}

/** { doc, text, error }. Absent -> all null. Unreadable -> error, never a guess. */
async function readJsonFile(url) {
  if (!existsSync(url)) return { doc: null, text: null, error: `${url.pathname} is absent` };
  const text = await readFile(url, 'utf8');
  try { return { doc: JSON.parse(text), text, error: null }; } catch (err) {
    return { doc: null, text, error: `${url.pathname} is not valid JSON: ${err.message}` };
  }
}

const net = {
  json: (url, opts) => fetchJson(url, opts),
  text: (url, opts) => fetchText(url, opts),
};

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return Number.isInteger(v) ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(v);
}

function printSummary(out, timings, dest) {
  const rows = [...out.counters.harm, ...out.counters.benefit];
  const w = Math.max(...rows.map((r) => r.id.length));
  console.log('');
  console.log(`${'counter'.padEnd(w)}  side     state  ${'value'.padStart(13)}  ms`);
  console.log('-'.repeat(w + 36));
  for (const r of rows) {
    let line = `${r.id.padEnd(w)}  ${r.side.padEnd(7)}  ${r.state === 'live' ? 'LIVE ' : 'DARK '}  ${fmt(r.value).padStart(13)}  ${String(timings.get(r.id) ?? '').padStart(5)}`;
    if (r.state !== 'live') line += `  ${r.error}`;
    console.log(line);
  }
  const n = out.newsroom;
  const d = out.indices.doomcon;
  const b = out.indices.bliss;
  const beam = n.beam;
  const beamText = beam.state !== 'live' ? 'beam dark' : beam.level ? `beam level (${beam.level_reason})` : `beam: ${beam.sinks} pan down ${beam.angle_deg} deg`;
  console.log('');
  console.log(
    `balance: ${n.state === 'live'
      ? `newsroom ${utcStamp(n.generated_at)} — ${n.items.scanned} headlines scanned in ${n.stories.scanned} stories: ` +
        `harm list ${n.stories.harm_list}, benefit list ${n.stories.benefit_list}, both ${n.stories.both}, neither ${n.stories.neither}`
      : `newsroom DARK (${n.error})`} · ${beamText} · ` +
    `counters ${out.counters.live} live, ${out.counters.dark} dark · ` +
    `DOOMCON ${d.state === 'live' ? `${d.level} ${d.level_name} ${d.score.toFixed(1)}` : d.state.toUpperCase()} · ` +
    `BLISS ${b.state === 'awaiting-baseline' ? 'awaiting baseline' : b.state === 'live' ? b.score.toFixed(1) : 'DARK'} · ` +
    `ledger ${out.ledger.state}${out.ledger.state === 'valid' ? ` (${out.ledger.rows.benefit} benefit, ${out.ledger.rows.harm} harm rows)` : ''} · ${dest}`,
  );
  if (out.ledger.state !== 'valid') console.error(`\n${out.ledger.error}`);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.selftest) return runSelftest();
  const dataDir = new URL(`${args.data.replace(/\/*$/, '')}/`, ROOT);
  const outUrl = args.out ? new URL(args.out, ROOT) : new URL('balance.json', dataDir);

  const [news, state, bliss, ledger] = await Promise.all([
    readJsonFile(new URL('news.json', dataDir)),
    readJsonFile(new URL('state.json', dataDir)),
    readJsonFile(new URL('bliss.json', dataDir)),
    readJsonFile(new URL('ledger.json', dataDir)),
  ]);

  const generatedAt = newestTimestamp([
    news.doc?.generated_at, state.doc?.generated_at, bliss.doc?.generated_at,
    ledger.doc?.as_of_date ? `${ledger.doc.as_of_date}T00:00:00.000Z` : null,
  ]);
  if (!generatedAt) throw new Error('balance: no input carries a timestamp, so there is nothing to anchor the file on');
  const window = counterWindow(generatedAt);

  const adapters = await discoverAdapters();
  if (!args.quiet) console.log(`balance: ${adapters.length} counters, window ${window.from} to ${window.to} (anchor ${generatedAt})`);
  const settled = await Promise.all(adapters.map((a) => runCounter(a, net, window)));
  const timings = new Map(settled.map((s) => [s.record.id, s.ms]));

  const out = buildBalance({
    news: news.doc, newsError: news.error,
    state: state.doc, stateError: state.error,
    bliss: bliss.doc, blissError: bliss.error,
    ledger: ledger.doc, ledgerText: ledger.text, ledgerError: ledger.error,
    counters: settled.map((s) => s.record),
    window, generatedAt,
  });

  if (!args.dryRun) await writeFile(outUrl, serialise(out), 'utf8');
  if (!args.quiet) printSummary(out, timings, args.dryRun ? '(dry run — nothing written)' : `wrote ${outUrl.pathname.replace(ROOT.pathname, '')}`);

  // A few dark counters is a normal Tuesday. A broken register, or every
  // counter dark at once, is not, and the workflow should go red.
  if (out.ledger.state !== 'valid' || out.counters.live === 0) process.exitCode = 1;
  return out;
}

// ---------------------------------------------------------------------------
// Self-test — `node collector/balance.mjs --selftest`, no network.
// ---------------------------------------------------------------------------

async function runSelftest() {
  const failures = [];
  const eq = (name, got, want) => {
    const g = JSON.stringify(got);
    const w = JSON.stringify(want);
    if (g !== w) failures.push(`${name}\n    got  ${g}\n    want ${w}`);
    else console.log(`  ok  ${name}`);
  };
  const ok = (name, cond, detail = '') => {
    if (!cond) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
    else console.log(`  ok  ${name}`);
  };
  const item = (id, title, summary = '', kind = 'press', extra = {}) => ({
    id, title, summary, kind, source: 'techmeme', url: `https://example.org/${id}`, published_at: '2026-09-27T12:00:00.000Z', score: 30, ...extra,
  });
  const tagOf = (title, summary, kind) => classifyItem(item('x', title, summary, kind)).tag;

  console.log('lexicon');
  eq('78 harm terms, 47 benefit terms, as verified', [HARM_TERMS.length, BENEFIT_TERMS.length], [78, 47]);
  ok('every term is already in wordSequence() form and 1-4 words', [...HARM_TERMS, ...BENEFIT_TERMS, ...HEDGE_TERMS]
    .every((t) => wordSequence(t).join(' ') === t && t.split(' ').length <= 4));
  ok('no term sits on both lists', HARM_TERMS.every((t) => !BENEFIT_TERMS.includes(t)));
  let threw = false;
  try { compileTerms(['Deepfake'], 'T'); } catch { threw = true; }
  ok('a term not in wordSequence() form is refused at load', threw);

  console.log('word boundaries');
  eq('"Hacker News" in a summary fires nothing', tagOf('Show HN: a tool', '81 points, 143 comments on Hacker News.'), 'neither');
  eq('"attacker" is not "attack"', tagOf('An attacker profile', ''), 'neither');
  eq('"breaches" fires as itself', classifyItem(item('x', 'Two breaches at a lab')).hits.harm.title, ['breaches']);
  eq('case-insensitive: "DEEPFAKE" fires', tagOf('DEEPFAKE of a mayor spreads', ''), 'harm');
  eq('hyphen splits: "deepfake-driven" fires deepfake', classifyItem(item('x', 'A deepfake-driven scheme')).hits.harm.title, ['deepfake']);
  eq('accent folding: "tumeur" is not "tumour", "Diagnóse" folds to diagnose', [tagOf('Une tumeur', ''), tagOf('Diagnóse by model', '')], ['neither', 'benefit']);
  eq('phrase: "laid off" fires, "laid" alone does not', [tagOf('Studio laid off 40 staff', ''), tagOf('Plans laid for a lab', '')], ['harm', 'neither']);
  eq('three-word phrase: "tried to hack"', classifyItem(item('x', 'Agent tried to hack a UN site')).hits.harm.title, ['tried to hack']);
  eq('"early detection" fires on the benefit side', tagOf('Model helps early detection of sepsis', ''), 'benefit');

  console.log('negation');
  eq('"There are no rogue AI agents" is not harm', tagOf('There are no "rogue" AI agents', ''), 'neither');
  eq('negator two words back still negates', classifyItem(item('x', 'No, the breach was fake')).negated, [{ term: 'breach', field: 'title', by: 'no' }]);
  eq('negator three words back does not', tagOf('No one said the breach was small', ''), 'harm');
  eq('"not" and "never" negate too', [tagOf('It was not fraud', ''), tagOf('Never a lawsuit', '')], ['neither', 'neither']);
  eq('an all-negated item says so', classifyItem(item('x', 'There are no rogue agents')).set_aside, 'every hit is negated');

  console.log('hedges');
  eq('a question headline counts nowhere', tagOf('Can detectors catch a jailbreak?', ''), 'neither');
  eq('a question with a trailing credit counts nowhere', tagOf('Is this a new scam? (Jane Doe/Wired)', ''), 'neither');
  eq('"warns" sets the item aside', classifyItem(item('x', 'Gates warns of AI misuse')).set_aside, 'hedge word "warns" in the headline');
  eq('"Q&A" is a hedge', hedgeOf('Q&A: the lawsuit explained'), 'q a');
  eq('"may" is not a hedge (it is also a month)', tagOf('May breach report lands', ''), 'harm');
  eq('a hedge sets the benefit side aside too', tagOf('Could a cure be near', ''), 'neither');

  console.log('the title / summary rule');
  eq('one headline hit counts', tagOf('Firm fined over data', ''), 'harm');
  eq('one distinct summary hit does not', classifyItem(item('x', 'A plain headline', 'It mentions a lawsuit.')).set_aside, 'one distinct summary hit; the rule needs 2');
  eq('the same word twice is one distinct hit', tagOf('A plain headline', 'lawsuit after lawsuit'), 'neither');
  eq('two distinct summary hits count', tagOf('A plain headline', 'A lawsuit over a deepfake.'), 'harm');
  eq('papers, labs, releases and models are not scanned', ['paper', 'lab', 'release', 'model'].map((k) => classifyItem(item('x', 'A breach', '', k)).scanned), [false, false, false, false]);
  eq('forum and press items are scanned', ['forum', 'press'].map((k) => classifyItem(item('x', 'A breach', '', k)).scanned), [true, true]);

  console.log('both / neither, items and stories');
  eq('an item on both lists is "both"', tagOf('Deepfake scam hits a cancer charity', ''), 'both');
  const fixtureNews = {
    generated_at: '2026-09-28T02:46:46.998Z', window_days: 7, max_items: 200,
    items: [
      item('a1', 'Hospital network breached', '', 'press', { published_at: '2026-09-27T10:00:00.000Z' }),
      item('a2', 'Hospital network breach confirmed', '', 'press', { published_at: '2026-09-27T11:00:00.000Z' }),
      item('b1', 'Model flags cancer early', '', 'forum', { published_at: '2026-09-27T09:00:00.000Z' }),
      item('c1', 'Deepfake scam hits a cancer charity', '', 'press', { published_at: '2026-09-26T09:00:00.000Z' }),
      item('d1', 'Lab ships a new model', '', 'press', { published_at: '2026-09-25T09:00:00.000Z' }),
      item('p1', 'Jailbreak attacks on VLMs', '', 'paper', { published_at: '2026-09-25T08:00:00.000Z' }),
      item('r1', 'v2.1 fixes a leak', '', 'release', { published_at: '2026-09-25T07:00:00.000Z' }),
    ],
    stories: [{ id: 's-hosp', members: ['a1', 'a2'] }],
  };
  const nb = newsroomBlock(fixtureNews);
  eq('items: 5 scanned, 2 harm-only, 1 benefit-only, 1 both, 1 neither', [nb.items.scanned, nb.items.harm_only, nb.items.benefit_only, nb.items.both, nb.items.neither], [5, 2, 1, 1, 1]);
  eq('stories: a cluster of two harm headlines counts once', [nb.stories.scanned, nb.stories.harm_only, nb.stories.benefit_only, nb.stories.both, nb.stories.neither], [4, 1, 1, 1, 1]);
  eq('harm_list and benefit_list include "both"', [nb.stories.harm_list, nb.stories.benefit_list], [2, 2]);
  eq('the partition adds up', nb.stories.harm_only + nb.stories.benefit_only + nb.stories.both + nb.stories.neither, nb.stories.scanned);
  eq('not-scanned kinds are counted by kind, not dropped', nb.not_scanned, { total: 2, by_kind: { paper: 1, release: 1 } });
  eq('a "both" item appears in both matched lists', [nb.matched.harm.map((r) => r.id), nb.matched.benefit.map((r) => r.id)], [['a2', 'a1', 'c1'], ['b1', 'c1']]);
  eq('the beam tilts on stories, not items (1 v 1 is level)', [nb.beam.harm, nb.beam.benefit, nb.beam.level], [1, 1, true]);

  console.log('the beam');
  eq('11 v 0: harm pan down, full tilt', beamFor(11, 0), { level: false, level_reason: null, sinks: 'harm', angle_deg: 8 });
  eq('6 v 2: harm pan down, half tilt', beamFor(6, 2).angle_deg, 4);
  eq('2 v 7: benefit pan down', [beamFor(2, 7).sinks, beamFor(2, 7).angle_deg], ['benefit', 4.44]);
  eq('4 v 2: within the deadband, level', [beamFor(4, 2).level, beamFor(4, 2).sinks], [true, null]);
  eq('4 v 0: too few tagged, level', beamFor(4, 0).level_reason, 'fewer than 5 stories matched one list only');
  eq('0 v 0: level, never a division by zero', beamFor(0, 0).angle_deg, 0);
  threw = false;
  try { beamFor(null, 2); } catch { threw = true; }
  ok('a missing count is refused, not read as zero', threw);
  eq('no newsroom: the beam is dark and level, counts null', (() => { const d = newsroomBlock(null); return [d.state, d.beam.state, d.beam.level, d.beam.harm]; })(), ['dark', 'dark', true, null]);

  console.log('counters');
  const W = { from: '2026-08-29', to: '2026-09-28' };
  const fake = (id, collect, extra = {}) => validateAdapter({
    id, side: 'harm', label: id, endpoint: 'https://example.org', counts: 'c', does_not_count: 'd',
    keyless: true, windowed: true, ai_specific: true, context_only: false, collect, ...extra,
  });
  const fixedClock = () => 0;
  const r1 = await runCounter(fake('ok', async () => ({ value: 54, unit: 'incidents entered', meta: { a: 1 } })), {}, W, { clock: fixedClock });
  eq('a live counter keeps its value, unit and window', [r1.record.state, r1.record.value, r1.record.unit, r1.record.window], ['live', 54, 'incidents entered', W]);
  const r2 = await runCounter(fake('boom', async () => { throw new Error('HTTP 503 from https://example.org'); }), {}, W, { clock: fixedClock });
  eq('a throwing counter is dark with its error and a null value', [r2.record.state, r2.record.value, r2.record.error], ['dark', null, 'HTTP 503 from https://example.org']);
  const r3 = await runCounter(fake('nul', async () => ({ value: null })), {}, W, { clock: fixedClock });
  eq('a null value is dark, never a zero', [r3.record.state, r3.record.value], ['dark', null]);
  const r4 = await runCounter(fake('nan', async () => ({ value: Number.NaN })), {}, W, { clock: fixedClock });
  eq('a NaN value is dark', r4.record.state, 'dark');
  const r5 = await runCounter(fake('hang', () => new Promise(() => {})), {}, W, { watchdogMs: 20, clock: fixedClock });
  eq('a wedged counter is cut off by the watchdog and goes dark', [r5.record.state, r5.record.error], ['dark', 'hang: timed out after 20ms']);
  const r6 = await runCounter(fake('sync', () => { throw new Error('sync throw'); }), {}, W, { clock: fixedClock });
  eq('a synchronous throw is caught too', r6.record.error, 'sync throw');
  const r7 = await runCounter(fake('unwindowed', async () => ({ value: 1 }), { windowed: false }), {}, W, { clock: fixedClock });
  eq('an unwindowed counter publishes no window', r7.record.window, null);
  threw = false;
  try { validateAdapter({ id: 'x', side: 'good', label: 'l', endpoint: 'e', counts: 'c', does_not_count: 'd', keyless: true, windowed: true, ai_specific: true, context_only: false, collect() {} }); } catch { threw = true; }
  ok('an adapter on a side that is not harm or benefit is refused', threw);
  eq('the window is the 30 whole days before the anchor day plus the anchor day', counterWindow('2026-09-28T02:46:46.998Z'), W);

  console.log('adapter parsers (fixtures, no network)');
  const fda = await import('./balance-sources/fda-ai-devices.mjs');
  const csv = 'Date of Final Decision,Submission Number,Device,Company,Panel (Lead),Primary Product Code\r\n' +
    '06/29/2026,K253628,"Auto-Seg (SO-0012), Spine Auto-Seg (SO-0012)","Agada Medical, Ltd.",Radiology,QIH\r\n' +
    '09/10/2026,K260001,"A ""quoted"" name",Co,Cardiovascular,DQK\r\n' +
    '13/45/2026,K260002,Bad date,Co,Radiology,QIH\r\n';
  const s = fda.summarise(fda.parseCsv(csv), W);
  eq('FDA CSV: quoted commas and doubled quotes stay in one field', fda.parseCsv(csv)[2][2], 'A "quoted" name');
  eq('FDA summary: rows, window, unparseable date kept out of the years', [s.rows, s.decisions_in_window, s.unparseable_dates, s.newest_decision, s.by_year], [3, 1, 1, '2026-09-10', { 2026: 2 }]);
  threw = false;
  try { fda.summarise([['Date', 'Number']], W); } catch { threw = true; }
  ok('FDA: a changed header is refused', threw);
  const aiid = await import('./balance-sources/aiid-incidents.mjs');
  const pd = { result: { data: {
    incidents: { nodes: [{ incident_id: 1 }, { incident_id: 2 }, { incident_id: 3 }] },
    reports: { nodes: [
      { incident_id: 1, reports: [{ date_submitted: 'Sun Sep 27 2026 00:00:00 GMT+0000 (Coordinated Universal Time)' }, { date_submitted: 'Mon Jan 05 2026 00:00:00 GMT+0000 (Coordinated Universal Time)' }] },
      { incident_id: 2, reports: [{ date_submitted: 'Sat Aug 29 2026 00:00:00 GMT+0000 (Coordinated Universal Time)' }] },
    ] },
  } } };
  const e = aiid.entryDays(pd);
  eq('AIID: entry = earliest report submission; an incident with no reports has none', [e.entry.get(1), e.entry.get(2), e.undated], ['2026-01-05', '2026-08-29', [3]]);
  eq('AIID: the window is inclusive at both ends', aiid.countEntered(e.entry, W), 1);
  const oecd = await import('./balance-sources/oecd-aim.mjs');
  eq('OECD: the count line parses through tags and &amp;', oecd.parseCount('<div><span>Results:</span> About <b>1,602</b> incidents &amp; hazards</div>'), 1602);
  threw = false;
  try { oecd.parseCount('<div>nothing here</div>'); } catch { threw = true; }
  ok('OECD: a page without the line is refused, not read as zero', threw);
  ok('OECD: the URL encodes exactly as verified', oecd.pageUrl('2026-08-29', '2026-09-28') ===
    'https://oecd.ai/en/incidents?search_terms=%5B%5D&and_condition=false&from_date=2026-08-29&to_date=2026-09-28&properties_config=%7B%22principles%22%3A%5B%5D%2C%22industries%22%3A%5B%5D%2C%22harm_types%22%3A%5B%5D%2C%22harm_levels%22%3A%5B%5D%2C%22harmed_entities%22%3A%5B%5D%2C%22business_functions%22%3A%5B%5D%2C%22ai_tasks%22%3A%5B%5D%2C%22autonomy_levels%22%3A%5B%5D%2C%22languages%22%3A%5B%5D%7D&order_by=date&num_results=20');
  const ct = await import('./balance-sources/clinicaltrials-ai-starts.mjs');
  ok('ClinicalTrials: the URL encodes exactly as verified', ct.startsUrl('2026-08-29', '2026-09-28') ===
    'https://clinicaltrials.gov/api/v2/studies?query.term=%22artificial%20intelligence%22%20OR%20%22machine%20learning%22&filter.advanced=AREA%5BStartDate%5DRANGE%5B2026-08-29%2C2026-09-28%5D%20AND%20AREA%5BStartDateType%5DACTUAL&countTotal=true&pageSize=1&fields=NCTId');
  const kev = await import('./balance-sources/cisa-kev-added.mjs');
  eq('KEV: trailing window and calendar month counted separately', kev.countAdded(
    [{ dateAdded: '2026-08-28' }, { dateAdded: '2026-08-29' }, { dateAdded: '2026-09-01' }, { dateAdded: '2026-09-28' }, { dateAdded: '2026-09-29' }],
    { ...W, month: '2026-09' }), { inWindow: 3, inMonth: 3 });

  console.log('DOOMCON and BLISS');
  const blissFixture = { generated_at: '2026-09-28T02:22:45.038Z', score: null, level: null, level_name: null, posture: 'awaiting-baseline', sources_reporting: 9, sources_total: 10, failed_sources: ['openalex-ai-science'] };
  const bl = indexBlock('BLISS', blissFixture);
  eq('BLISS awaiting baseline is printed as that, with no number', [bl.state, bl.score, bl.printed_as], ['awaiting-baseline', null, 'awaiting baseline']);
  eq('a missing DOOMCON reading is dark, not zero', [indexBlock('DOOMCON', null).state, indexBlock('DOOMCON', null).score], ['dark', null]);
  eq('a scored DOOMCON is live with its score', indexBlock('DOOMCON', { score: 39.6108, level: 4, level_name: 'ROUTINE', generated_at: 't' }).score, 39.6108);

  console.log('the registers');
  const ledgerUrl = new URL('../data/ledger.json', import.meta.url);
  let ledgerText = null;
  let ledgerDoc = null;
  if (existsSync(ledgerUrl)) { ledgerText = await readFile(ledgerUrl, 'utf8'); ledgerDoc = JSON.parse(ledgerText); }
  ok('data/ledger.json is present', ledgerDoc !== null);
  if (ledgerDoc) {
    const lb = ledgerBlock(ledgerDoc, ledgerText);
    ok('data/ledger.json passes its checks (rows, statuses, sources, totals, canonical form)', lb.state === 'valid', lb.error ?? '');
    const broken = structuredClone(ledgerDoc);
    broken.harm[0].status = 'suspected';
    ok('a status outside the vocabulary is caught', ledgerBlock(broken, null).state === 'invalid');
    const dup = structuredClone(ledgerDoc);
    dup.benefit[1].id = dup.benefit[0].id;
    ok('a duplicated id is caught', /used twice/.test(ledgerBlock(dup, null).error ?? ''));
    const tot = structuredClone(ledgerDoc);
    tot.totals.harm.rows += 1;
    ok('totals that disagree with the rows are caught', /totals do not match/.test(ledgerBlock(tot, null).error ?? ''));
    const nosrc = structuredClone(ledgerDoc);
    delete nosrc.benefit[0].numbers[0].source_url;
    ok('a number without its source is caught', ledgerBlock(nosrc, null).state === 'invalid');
    ok('a hand-formatted (non-canonical) file is caught', /not canonical/.test(ledgerBlock(ledgerDoc, JSON.stringify(ledgerDoc)).error ?? ''));
  }

  console.log('determinism');
  const inputs = {
    news: fixtureNews, state: { generated_at: '2026-09-28T02:22:30.156Z', score: 39.6108, level: 4, level_name: 'ROUTINE' },
    bliss: blissFixture, ledger: ledgerDoc, ledgerText,
    counters: [r1.record, r2.record, { ...r7.record, side: 'benefit', id: 'b-one' }],
  };
  inputs.generatedAt = newestTimestamp([inputs.news.generated_at, inputs.state.generated_at, inputs.bliss.generated_at, '2026-09-28T00:00:00.000Z']);
  inputs.window = counterWindow(inputs.generatedAt);
  eq('generated_at is the newest input stamp', inputs.generatedAt, '2026-09-28T02:46:46.998Z');
  // Booby-trap the clock and the dice for the duration of the build: any read
  // of either throws, so a pass proves the assembly never touches them.
  const RealDate = globalThis.Date;
  const realRandom = Math.random;
  class TrapDate extends RealDate {
    constructor(...a) { if (a.length === 0) throw new Error('clock read inside buildBalance'); super(...a); }
    static now() { throw new Error('Date.now() inside buildBalance'); }
  }
  let a;
  let b2;
  let trapError = null;
  try {
    globalThis.Date = TrapDate;
    Math.random = () => { throw new Error('Math.random() inside buildBalance'); };
    a = serialise(buildBalance(inputs));
    b2 = serialise(buildBalance(structuredClone(inputs)));
  } catch (err) {
    trapError = err.message;
  } finally {
    globalThis.Date = RealDate;
    Math.random = realRandom;
  }
  ok('the build reads neither the clock nor Math.random', trapError === null, trapError ?? '');
  ok('two builds over the same inputs are byte-identical', a === b2 && typeof a === 'string');
  if (a) {
    const doc = JSON.parse(a);
    ok('no net, ratio or difference field anywhere in the output', !/"(net|ratio|difference|balance_score|verdict)"\s*:/.test(a));
    eq('counters are grouped by side, never totalled', [doc.counters.harm.length, doc.counters.benefit.length, Object.hasOwn(doc.counters, 'total')], [2, 1, false]);
  }

  console.log('voice');
  const { findFutureViolation, findUrlViolation } = await import('./posts.mjs');
  // Every string this layer authors and a page might print: the honesty lines,
  // the rule texts, the sentence, the beam's reasons, each adapter's label and
  // count descriptions, and the ledger's frame. Headlines, term lists and
  // third-party error text are not ours and are not checked.
  const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  const built = a ? JSON.parse(a) : null;
  const authored = [
    ...HONESTY, nb.sentence, beamFor(4, 2).level_reason, beamFor(4, 0).level_reason,
    ...(built ? [built.generated_at_rule, built.counters.window_rule, built.indices.note, ...strings(built.beam_rule),
      ...strings(built.lexicon.rule), built.lexicon.measured.sample, built.lexicon.measured.labels] : []),
  ];
  for (const ad of await discoverAdapters()) authored.push(ad.label, ad.counts, ad.does_not_count);
  if (ledgerDoc) authored.push(ledgerDoc.what_this_is, ...ledgerDoc.honesty, ledgerDoc.curation, ...Object.values(ledgerDoc.status_words.benefit), ...Object.values(ledgerDoc.status_words.harm), ...ledgerDoc.dropped.map((d) => d.reason));
  const future = authored.map((t) => [t, findFutureViolation(t)]).filter(([, v]) => v);
  ok('every authored sentence passes the future-tense ban', future.length === 0, future.map(([t, v]) => `"${v.match}" in: ${t.slice(0, 80)}`).join('\n    '));
  const urls = [...HONESTY, nb.sentence].map((t) => [t, findUrlViolation(t)]).filter(([, v]) => v);
  ok('the page sentences carry no URL', urls.length === 0, urls.map(([t, v]) => `${v.why} in: ${t.slice(0, 80)}`).join('\n    '));
  eq('a window without a readable stamp prints no sentence rather than a wrong one', newsroomBlock({ items: [] }).sentence, null);
  eq('the sentence carries both counts, the denominator and the UTC stamp', nb.sentence, "2 of 4 stories in the newsroom's current window matched the harm list and 2 matched the benefit list, as of 02:46 UTC on Mon 28 Sep 2026. A count of words, not of outcomes.");

  console.log('');
  if (failures.length) {
    console.error(`balance selftest: ${failures.length} FAILURE(S)\n`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exitCode = 1;
  } else {
    console.log('balance selftest: all checks passed');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // Reaching here means the run could not be set up at all. No file is
    // written: an output this collector cannot vouch for is worse than none.
    console.error(`balance: fatal — ${errorMessage(err)}`);
    process.exitCode = 1;
  });
}
