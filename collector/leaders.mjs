#!/usr/bin/env node
// SIREN leader wire — what the people running AI actually said this week.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/leaders.mjs
//
// ---------------------------------------------------------------------------
// THE ABSOLUTE RULE, FIRST, BECAUSE EVERY OTHER DECISION IN THIS FILE IS
// DOWNSTREAM OF IT
// ---------------------------------------------------------------------------
//
// This module NEVER generates, paraphrases, summarises or reconstructs a
// quotation. The only string it ever publishes as words attributed to a person
// is the HEADLINE, byte-for-byte as the publication printed it, carried
// straight through from data/news.json with its own URL beside it.
//
// Attributing invented words to a named living person is the single worst
// thing this site could do. It is worse than a wrong number, because a wrong
// number is falsifiable against a published formula and an invented quote is
// falsifiable against nothing — the person has to deny it, and the denial
// travels a tenth as far. Headline-only makes every line on the wire
// verifiable by clicking through, which is the same standard docs/NEWS.md sets
// for the reel and docs/METHODOLOGY.md sets for the index.
//
// Consequences, stated so a later edit cannot quietly undo them:
//
//   - `item.summary` from data/news.json is NOT copied here, even though it is
//     also publisher-written. A summary is prose about a person next to that
//     person's name, and the first 320 characters of a wire lede read as a
//     paraphrase of what they said. The headline is a complete published unit;
//     a clipped summary is not.
//   - Nothing is concatenated, rewritten, title-cased, de-hyphenated or
//     sentence-cased. `line.headline === item.title`, asserted below.
//   - The cue that matched is recorded as the literal substring of the
//     headline that matched it, so even the classification is quotable.
//
// ---------------------------------------------------------------------------
// WHAT IT IS FOR
// ---------------------------------------------------------------------------
//
// docs/RACE.md's loudness column asks for "the public posting cadence of each
// principal, from feeds we can legitimately fetch", and racePage.mjs already
// prints the honest outcome: seven of eight cells are empty, because
// darioamodei.com serves no feed, hassabis.com is a 114-byte redirect, and the
// rest post on X, where scraping carries an explicit permanent-suspension
// penalty. The empty column is a true finding and it is also a dead end.
//
// The press side is not a dead end. Every headline in data/news.json was
// fetched lawfully from a public feed we already read, and a headline that
// names a leader and carries a speech cue is evidence that the person spoke —
// evidence with a publisher, a timestamp and a URL on it.
//
// So this file solves the same question from the other side, and §3 of the
// brief is explicit about what happens when the two disagree: where race.mjs
// says `no_feed` and the wire has headlines, THE WIRE IS RIGHT, and it says
// where the line came from. That reconciliation is computed here — not in a
// template — and published per leader as `watch_floor`, so both surfaces read
// one object and cannot print two different sentences about the same person.
//
// ---------------------------------------------------------------------------
// SILENCE IS INFORMATION
// ---------------------------------------------------------------------------
//
// A leader with no match STAYS IN THE OUTPUT with `state: "no_line"` and zero
// lines. An absence rendered as a missing row is indistinguishable from a bug,
// and this repo has a standing rule against exactly that merge: docs/NEWS.md
// keeps `dormant` apart from `dark`, docs/VOICE.md keeps "awaiting baseline"
// apart from both. `no_line` is the third state here and it means one precise
// thing: no headline in OUR corpus named this person beside a speech cue. It
// is not a claim that the person said nothing. That distinction is published
// on the object as `no_line_means` so no caller has to remember it.
//
// ---------------------------------------------------------------------------
// NETWORK: DIRECT SOURCES ONLY, AND EVERY ONE OF THEM IS ALLOWED TO FAIL
// ---------------------------------------------------------------------------
//
// The press half of this module makes no HTTP request: it reads data/news.json
// and data/race.json off disk. The press corpus is capped by item count, so on
// a busy week it reaches back a day and a half, and a leader who published an
// essay on Monday read "no line" by Wednesday. So since matcher 1.1.0 the CLI
// also reads a short table of OFFICIAL feeds — the person's own blog or
// channel, or their organisation's newsroom — listed with their verification
// status in collector/leader-sources.mjs.
//
// Every request goes through collector/fetch.mjs (CONTRACT.md §1.5). Every
// feed is fetched independently, with no retries and a short timeout, and a
// feed that fails is recorded on the leader's row as unreachable — it never
// fails the run and it is never silently dropped. `--offline` skips the
// network entirely (the rows then say the direct sources were not checked).
//
// buildLeaders() itself stays PURE: the fetched feeds and the previous
// data/leaders.json are passed in as arguments, so a test can drive it with
// fixtures and two runs over the same inputs produce the same bytes.
//
// Writes data/leaders.json only. It touches nothing in public/, so it is
// order-independent with respect to site/build.mjs.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fetchText } from './fetch.mjs';
import { assertXmlFeed, parseFeed } from './news-sources/_feed.mjs';
import { LEADER_SOURCES, NO_SOURCE_REASON } from './leader-sources.mjs';
import {
  refreshCoverage, refreshProfiles, coverageView, profileView, adoptCoverage, adoptProfiles,
  COVERAGE_MIN_INTERVAL_MS, PROFILE_MIN_INTERVAL_MS, COVERAGE_DAYS,
} from './leader-coverage.mjs';

const SCHEMA_VERSION = 1;
const MATCHER_VERSION = '1.2.0';

// 7 days, matching docs/NEWS.md's collection window. The corpus is capped at
// 200 items, so on a busy week the cap binds long before the window does —
// which is a real limitation and is published as `corpus.window_binds`.
const WINDOW_DAYS = 7;

const NEWS_URL = new URL('../data/news.json', import.meta.url);
const RACE_URL = new URL('../data/race.json', import.meta.url);
const OUTPUT_URL = new URL('../data/leaders.json', import.meta.url);
// Coverage memory (Google News), profile cache (Wikipedia) and the direct-feed
// cache. All three are rewritten whole on every run and committed by the
// workflows beside data/leaders.json, because a runner is a fresh container and
// the committed file IS the memory — the same reasoning collect.yml gives for
// data/news.json's cadence ledger.
const COVERAGE_URL = new URL('../data/leaders-coverage.json', import.meta.url);
const PROFILES_URL = new URL('../data/leaders-profiles.json', import.meta.url);
const FEEDS_CACHE_URL = new URL('../data/leaders-feeds.json', import.meta.url);

// Roles and organisations in ROSTER were last checked by hand on this date.
// Published beside every row so a stale label is visibly stale.
const ROLE_AS_OF = '2026-10-09';

const DAY_MS = 86_400_000;
// A feed entry stamped more than this far past the clock is a broken date,
// not a statement from the future, and is ignored.
const FUTURE_SKEW_MS = DAY_MS;
// Per-feed politeness and patience. No retries: a feed that is down this hour
// is reported down this hour, and the next hourly run asks again.
const FEED_TIMEOUT_MS = 12_000;
const FEED_CONCURRENCY = 4;
const FEED_ENTRY_LIMIT = 60;

// Why a leader with nothing in the window has nothing in the window.
//   quiet                at least one direct source answered and none of them,
//                        nor the press, carried anything in the window
//   sources_unreachable  the person has direct sources and NONE answered, so
//                        the silence is ours, not theirs
//   no_sources           there is no official feed for this person at all;
//                        the press wire is the only reading
const SILENCE_REASONS = Object.freeze(['quiet', 'sources_unreachable', 'no_sources']);

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

// Fifteen people, fixed order, never reordered — the same discipline
// CONTRACT.md applies to the five pillars. Order is roughly "runs a frontier
// lab" then "runs the compute or the platform" then "the researchers whose
// names carry the argument", and it is the order rendered, so a reader who
// checks this page twice a week finds the same person in the same place.
//
// `org` is what the person is being quoted AS. It is a label on this site's
// page, not a claim about an employment contract, and the day it is wrong it
// is wrong in public — so `org_as_of` is published beside it and anything this
// repo cannot verify from its own data is marked `org_confidence: "stated"`
// rather than dressed up as measured.
//
// `aliases` is the published matching vocabulary. It is a DATA table, not a
// heuristic: there is no fuzzy matching, no edit distance, no first-initial
// inference. If a spelling is not in this list it does not match, and a reader
// who thinks we missed one can point at the exact missing string.
//
// `blocks` lists first names that RULE OUT a bare-surname match. Two real
// collisions drove it — Daniela Amodei is Anthropic's president and Samy
// Bengio is at Apple — and both would otherwise print under the wrong person's
// row with a headline that is genuinely about somebody else.
const ROSTER = Object.freeze([
  {
    id: 'altman', name: 'Sam Altman', initials: 'SA',
    org: 'OpenAI', org_id: 'openai', role: 'CEO',
    aliases: ['Sam Altman', 'Altman'],
    blocks: [],
    race_player: 'openai',
    news_query: { phrase: 'Sam Altman' },
    wikipedia: 'Sam Altman',
  },
  {
    id: 'amodei', name: 'Dario Amodei', initials: 'DA',
    org: 'Anthropic', org_id: 'anthropic', role: 'CEO',
    aliases: ['Dario Amodei', 'Amodei'],
    // Daniela Amodei, Anthropic's president, is a different person.
    blocks: ['Daniela'],
    race_player: 'anthropic',
    news_query: { phrase: 'Dario Amodei' },
    wikipedia: 'Dario Amodei',
  },
  {
    id: 'hassabis', name: 'Demis Hassabis', initials: 'DH',
    org: 'Google DeepMind', org_id: 'google-deepmind', role: 'CEO',
    aliases: ['Demis Hassabis', 'Hassabis'],
    blocks: [],
    race_player: 'google-deepmind',
    news_query: { phrase: 'Demis Hassabis' },
    wikipedia: 'Demis Hassabis',
  },
  {
    id: 'musk', name: 'Elon Musk', initials: 'EM',
    org: 'xAI', org_id: 'xai', role: 'Founder',
    aliases: ['Elon Musk', 'Musk'],
    blocks: [],
    race_player: 'xai',
    news_query: { phrase: 'Elon Musk' },
    wikipedia: 'Elon Musk',
  },
  {
    id: 'zuckerberg', name: 'Mark Zuckerberg', initials: 'MZ',
    org: 'Meta', org_id: 'meta', role: 'CEO',
    // "Zuck" is how several of these publications write him in a headline.
    aliases: ['Mark Zuckerberg', 'Zuckerberg', 'Zuck'],
    blocks: [],
    race_player: 'meta',
    news_query: { phrase: 'Mark Zuckerberg' },
    wikipedia: 'Mark Zuckerberg',
  },
  {
    id: 'huang', name: 'Jensen Huang', initials: 'JH',
    org: 'Nvidia', org_id: 'nvidia', role: 'CEO',
    // Bare "Huang" is DELIBERATELY ABSENT. It is one of the most common
    // surnames on earth and this corpus carries chip-supply-chain and
    // research-paper headlines by the hundred; a bare match would attribute a
    // stranger's words to a named living person, which is the one failure
    // this module exists to make impossible. "Jensen" alone is kept because in
    // an AI headline it is unambiguous.
    aliases: ['Jensen Huang', 'Jensen'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Jensen Huang' },
    wikipedia: 'Jensen Huang',
  },
  {
    id: 'nadella', name: 'Satya Nadella', initials: 'SN',
    org: 'Microsoft', org_id: 'microsoft', role: 'CEO',
    aliases: ['Satya Nadella', 'Nadella'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Satya Nadella' },
    wikipedia: 'Satya Nadella',
  },
  {
    id: 'pichai', name: 'Sundar Pichai', initials: 'SP',
    org: 'Alphabet', org_id: 'google', role: 'CEO',
    aliases: ['Sundar Pichai', 'Pichai'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Sundar Pichai' },
    wikipedia: 'Sundar Pichai',
  },
  {
    id: 'suleyman', name: 'Mustafa Suleyman', initials: 'MS',
    org: 'Microsoft AI', org_id: 'microsoft', role: 'CEO',
    aliases: ['Mustafa Suleyman', 'Suleyman'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Mustafa Suleyman', extra: 'AI' },
    wikipedia: 'Mustafa Suleyman',
  },
  {
    id: 'kavukcuoglu', name: 'Koray Kavukcuoglu', initials: 'KK',
    org: 'Google', org_id: 'google', role: 'Chief AI Architect',
    aliases: ['Koray Kavukcuoglu', 'Kavukcuoglu', 'Koray'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Koray Kavukcuoglu' },
    wikipedia: 'Koray Kavukcuoglu',
  },
  {
    id: 'lecun', name: 'Yann LeCun', initials: 'YL',
    // Left Meta at the end of 2025 to found AMI Labs (Advanced Machine
    // Intelligence), where he is executive chairman. Until then: Meta, Chief
    // AI Scientist.
    org: 'AMI Labs', org_id: 'ami-labs', role: 'Executive Chairman',
    // Three spellings are in live use across these feeds.
    aliases: ['Yann LeCun', 'Yann Le Cun', 'LeCun', 'Le Cun'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Yann LeCun' },
    wikipedia: 'Yann LeCun',
  },
  {
    id: 'hinton', name: 'Geoffrey Hinton', initials: 'GH',
    org: 'University of Toronto', org_id: 'academia', role: 'Professor emeritus',
    aliases: ['Geoffrey Hinton', 'Geoff Hinton', 'Hinton'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Geoffrey Hinton' },
    wikipedia: 'Geoffrey Hinton',
  },
  {
    id: 'bengio', name: 'Yoshua Bengio', initials: 'YB',
    org: 'Mila, Université de Montréal', org_id: 'academia', role: 'Professor',
    aliases: ['Yoshua Bengio', 'Bengio'],
    // Samy Bengio is a different researcher at a different organisation.
    blocks: ['Samy'],
    race_player: null,
    news_query: { phrase: 'Yoshua Bengio' },
    wikipedia: 'Yoshua Bengio',
  },
  {
    id: 'mensch', name: 'Arthur Mensch', initials: 'AM',
    org: 'Mistral AI', org_id: 'mistral', role: 'CEO',
    aliases: ['Arthur Mensch', 'Mensch'],
    // "a mensch" / "the mensch" is an English noun and it is title-cased in a
    // title-cased headline, where the capital carries no information.
    blocks: ['a', 'an', 'the'],
    race_player: 'mistral',
    news_query: { phrase: 'Arthur Mensch', extra: 'Mistral' },
    wikipedia: 'Arthur Mensch',
  },
  {
    id: 'liang', name: 'Liang Wenfeng', initials: 'LW',
    org: 'DeepSeek', org_id: 'deepseek', role: 'Founder',
    // Family name first. Bare "Liang" is absent for the same reason bare
    // "Huang" is; "Wenfeng" alone is distinctive.
    aliases: ['Liang Wenfeng', 'Wenfeng'],
    blocks: [],
    race_player: 'deepseek',
    news_query: { phrase: 'Liang Wenfeng' },
    wikipedia: 'Liang Wenfeng',
  },
  {
    id: 'sutskever', name: 'Ilya Sutskever', initials: 'IS',
    // Co-founder; CEO since July 2025.
    org: 'Safe Superintelligence', org_id: 'ssi', role: 'CEO',
    aliases: ['Ilya Sutskever', 'Sutskever'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Ilya Sutskever' },
    wikipedia: 'Ilya Sutskever',
  },
  {
    id: 'murati', name: 'Mira Murati', initials: 'MM',
    org: 'Thinking Machines Lab', org_id: 'thinking-machines', role: 'CEO',
    aliases: ['Mira Murati', 'Murati'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Mira Murati' },
    wikipedia: 'Mira Murati',
  },
  {
    id: 'karpathy', name: 'Andrej Karpathy', initials: 'AK',
    org: 'Eureka Labs', org_id: 'eureka-labs', role: 'Founder',
    aliases: ['Andrej Karpathy', 'Karpathy'],
    blocks: [],
    race_player: null,
    news_query: { phrase: 'Andrej Karpathy' },
    wikipedia: 'Andrej Karpathy',
  },
  {
    id: 'brockman', name: 'Greg Brockman', initials: 'GB',
    org: 'OpenAI', org_id: 'openai', role: 'President',
    aliases: ['Greg Brockman', 'Brockman'],
    blocks: [],
    race_player: 'openai',
    news_query: { phrase: 'Greg Brockman' },
    wikipedia: 'Greg Brockman',
  },
]);

// ---------------------------------------------------------------------------
// Speech cues
// ---------------------------------------------------------------------------

// CORE is the brief's list, verbatim, plus the ordinary inflections of the
// same verbs — "said" and "says" are one cue with two endings, and a matcher
// that took one and not the other would be a typo dressed as a rule.
//
// Every entry is matched WHOLE-WORD and case-insensitively against the
// headline, and the literal substring that matched is recorded on the line.
const CUES_CORE = Object.freeze([
  'say', 'says', 'said', 'saying',
  'tell', 'tells', 'told', 'telling',
  'warn', 'warns', 'warned', 'warning', 'warnings',
  'argue', 'argues', 'argued', 'arguing',
  'interview', 'interviews', 'interviewed',
  'Q and A', 'Q&A',
  'testify', 'testifies', 'testified', 'testimony',
  'podcast', 'podcasts',
  'keynote', 'keynotes',
  'letter', 'letters',
  'memo', 'memos',
]);

// EXTENDED is an editorial judgement and it is disclosed rather than buried,
// the same treatment docs/NEWS.md gives the source weights.
//
// The measurement that produced it: on the corpus of 2026-09-25 the headline
// "Jensen Huang talks about AI and climate change like a supervillain" (The
// Verge) is a leader speaking on the record, in public, and the core list
// misses it — because the brief's list happens to contain "tells" and not
// "talks". Printing "Nothing on the record this week" under Jensen Huang's
// name on a day The Verge published that headline would be a false statement
// produced by a word list, which is not a better failure than the one the word
// list exists to prevent.
//
// So: near-synonyms of the same act, nothing else. No "reveals", no "admits",
// no "slams" — those are a publication's verdict on the speech, not a marker
// that speech happened. Every line records `cue_group`, so a reader can see
// which list caught it, and CLI output counts both.
const CUES_EXTENDED = Object.freeze([
  'talk', 'talks', 'talked', 'talking',
  'speak', 'speaks', 'spoke', 'speaking', 'speech',
  'quoted', 'remarks',
]);

// A cue is evidence that speech happened. It is not all the same KIND of
// evidence, and collapsing the difference is how a wire starts implying things
// it did not measure.
//
// The case that forced this is live in the corpus of 2026-09-25: "Sources: a
// White House memo paints effective altruism as a fringe, dangerous cult that
// 'built the AI-doom pipeline' and places Dario Amodei at its foundation"
// (Axios, via Techmeme) matches the brief's cue "memo" — and the memo is
// ABOUT him, not BY him. The headline is printed verbatim either way, so
// nothing false is published, but a row that prints it under "Dario Amodei"
// with no further marking invites the reader to hear it as him speaking.
//
// So every line carries a class as well as a cue, and the surfaces print it:
//
//   verb       an act of speech in the headline's own verb — says, told, argues
//   appearance a venue or format — interview, podcast, keynote, testimony
//   document   a document names the person — letter, memo. It may be BY them or
//              ABOUT them, and the headline is the only thing that can tell you
//   quote      the publication put words in quotation marks
const CUE_CLASS = Object.freeze({
  verb: [
    'say', 'says', 'said', 'saying', 'tell', 'tells', 'told', 'telling',
    'warn', 'warns', 'warned', 'warning', 'warnings',
    'argue', 'argues', 'argued', 'arguing',
    'testify', 'testifies', 'testified',
    'talk', 'talks', 'talked', 'talking',
    'speak', 'speaks', 'spoke', 'speaking', 'quoted',
  ],
  appearance: [
    'interview', 'interviews', 'interviewed', 'Q and A', 'Q&A',
    'podcast', 'podcasts', 'keynote', 'keynotes', 'testimony', 'speech', 'remarks',
  ],
  document: ['letter', 'letters', 'memo', 'memos'],
  quote: ['quoted text'],
  // Not a headline cue at all: the line came from the person's own feed or
  // their organisation's official channel (collector/leader-sources.mjs), so
  // the act of publishing IS the statement. Never matched against press text.
  official: ['own post', 'own video', 'byline', 'official post', 'official video'],
});

const CLASS_OF = new Map();
for (const [cls, cues] of Object.entries(CUE_CLASS)) for (const c of cues) CLASS_OF.set(c, cls);

// Quoted text inside a headline is the fifteenth cue in the brief's list, and
// it is the strongest of them: a publication putting a phrase in quotation
// marks in a headline is asserting somebody said those words. Straight and
// curly double quotes only. Single quotes are NOT matched — the apostrophe in
// "Zuckerberg's" makes the British-press single-quote headline style
// undecidable without a parser, and a wrong cue here is a wrong attribution.
const QUOTED = /[“"]([^“”"]{6,240})[”"]/u;
const TWO_WORDS = /\S+\s+\S/u;

// ---------------------------------------------------------------------------
// Matching primitives
// ---------------------------------------------------------------------------

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Unicode-aware word boundaries. \b is ASCII-only and would refuse to bound
// "Université"; it also treats an apostrophe as a boundary in the direction we
// want ("Zuckerberg's" matches "Zuckerberg") and a hyphen likewise.
function wordRe(term, flags = 'giu') {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, flags);
}

// Compiled once. Longest alias first, so "Sam Altman" is reported as the
// matched alias rather than the bare "Altman" inside it.
const MATCHERS = ROSTER.map((leader) => ({
  leader,
  aliases: [...leader.aliases]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .map((alias) => ({
      alias,
      re: wordRe(alias),
      // A single-token alias is a bare surname (or bare given name) and is the
      // only kind the block list can apply to. "Dario Amodei" needs no guard.
      bare: !/\s/.test(alias),
    })),
  blocks: new Set(leader.blocks.map((w) => w.toLowerCase())),
}));

const CUE_MATCHERS = [
  ...CUES_CORE.map((cue) => ({ cue, group: 'core', re: wordRe(cue) })),
  ...CUES_EXTENDED.map((cue) => ({ cue, group: 'extended', re: wordRe(cue) })),
];

// A cue with no class is a cue somebody added to one table and not the other.
// Fail at import time rather than shipping an unlabelled row.
for (const c of CUE_MATCHERS) {
  if (!CLASS_OF.has(c.cue)) throw new Error(`leaders: cue ${JSON.stringify(c.cue)} has no class in CUE_CLASS`);
}

/** The word immediately before `index`, lowercased, or '' at the start. */
function precedingWord(text, index) {
  const before = text.slice(0, index);
  const m = before.match(/([\p{L}\p{N}]+)[^\p{L}\p{N}]*$/u);
  return m ? m[1].toLowerCase() : '';
}

/**
 * Which roster members does this headline name?
 *
 * Whole-word, case-insensitive, against the published alias table only.
 * Returns one entry per leader (never one per occurrence), carrying the alias
 * that matched and its character offset, so the ordering downstream is a
 * property of the headline rather than of the roster.
 */
export function namedLeaders(headline) {
  const text = String(headline);
  const found = [];

  for (const m of MATCHERS) {
    let best = null;
    for (const a of m.aliases) {
      a.re.lastIndex = 0;
      let hit;
      while ((hit = a.re.exec(text)) !== null) {
        // A bare surname preceded by a blocked given name is somebody else.
        if (a.bare && m.blocks.has(precedingWord(text, hit.index))) continue;
        if (!best || hit.index < best.index) best = { alias: a.alias, index: hit.index };
        break;
      }
      if (best) break; // longest alias wins; stop at the first that matched
    }
    if (best) found.push({ id: m.leader.id, alias: best.alias, index: best.index });
  }

  return found.sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
}

/**
 * Does this headline carry a speech cue, and which one?
 *
 * Returns `{ cue, group, cue_class, text, index, all }` for the EARLIEST cue in
 * the headline —
 * earliest, not first-in-the-list, so the answer is a property of the sentence
 * the publication wrote. Ties break core-before-extended and then
 * alphabetically, which makes the choice total and the output byte-stable.
 * `all` carries every distinct cue found, because a headline with three of
 * them is stronger evidence than one with a single "letter" in it and a reader
 * should be able to see that without rerunning anything.
 */
export function speechCue(headline) {
  const text = String(headline);
  const hits = [];

  for (const c of CUE_MATCHERS) {
    c.re.lastIndex = 0;
    const hit = c.re.exec(text);
    if (hit) hits.push({ cue: c.cue, group: c.group, cue_class: CLASS_OF.get(c.cue), text: hit[0], index: hit.index });
  }

  const q = QUOTED.exec(text);
  if (q && TWO_WORDS.test(q[1].trim())) {
    // The cue is "the publication put words in quotation marks", and the
    // recorded text is the quoted span exactly as printed — reproduced, never
    // rewritten, and never presented on its own as a quotation.
    hits.push({ cue: 'quoted text', group: 'core', cue_class: 'quote', text: q[0], index: q.index });
  }

  if (!hits.length) return null;

  hits.sort((a, b) =>
    a.index - b.index ||
    (a.group === b.group ? 0 : a.group === 'core' ? -1 : 1) ||
    a.cue.localeCompare(b.cue));

  const distinct = [...new Set(hits.map((h) => h.cue))].sort();
  return { ...hits[0], all: distinct };
}

// ---------------------------------------------------------------------------
// Direct sources (collector/leader-sources.mjs)
// ---------------------------------------------------------------------------

const ROSTER_IDS = new Set(ROSTER.map((l) => l.id));

// Validate the source table at import time, the same way the cue table is
// validated: a row naming a leader who is not on the roster is a typo that
// would otherwise just never match.
for (const src of LEADER_SOURCES) {
  for (const id of src.leaders) {
    if (!ROSTER_IDS.has(id)) throw new Error(`leaders: source ${src.id} names unknown leader ${JSON.stringify(id)}`);
  }
  if (src.kind !== 'personal' && src.kind !== 'org') throw new Error(`leaders: source ${src.id} has unknown kind ${src.kind}`);
}

/** The direct sources configured for one leader, in table order. */
export function sourcesFor(leaderId, sources = LEADER_SOURCES) {
  return sources.filter((s) => s.leaders.includes(leaderId));
}

function firstTagText(block, names) {
  for (const n of names) {
    const m = block.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}\\s*>`, 'i'));
    if (m) {
      const v = m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1').trim();
      if (v) return v;
    }
  }
  return null;
}

/**
 * Entries of one RSS/Atom/YouTube feed: { title, url, published_at, author }.
 *
 * Title and link come from the shared news parser (collector/news-sources/
 * _feed.mjs) so entity decoding is identical to the press wire's. The DATE
 * does not: that parser falls back to <updated>, and on Posthaven <updated>
 * is "the CDN touched it" (collector/race.mjs, THE POSTHAVEN TRAP). Here an
 * entry with no <published>/<pubDate>/<dc:date> is dropped instead.
 *
 * A title the shared parser had to clip is dropped too: a clipped title is
 * not the headline the person published, and this module prints headlines
 * whole or not at all.
 */
export function parseLeaderFeed(xml, { limit = FEED_ENTRY_LIMIT } = {}) {
  const out = [];
  const blockRe = /<(entry|item)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;
  for (const m of String(xml).matchAll(blockRe)) {
    if (out.length >= limit) break;
    const block = m[0];
    const [parsed] = parseFeed(block, { limit: 1 });
    if (!parsed || !parsed.title || !parsed.url) continue;
    if (parsed.title.endsWith('…') && parsed.title.length >= 190) continue;

    const rawDate = firstTagText(block, ['published', 'pubDate', 'dc:date']);
    const ms = rawDate ? Date.parse(rawDate) : NaN;
    if (!Number.isFinite(ms)) continue;

    // <author><name>X</name></author> (Atom/YouTube), <dc:creator> (WordPress),
    // <author>email (Name)</author> (RSS 2.0).
    let author = firstTagText(block, ['dc:creator', 'name']);
    if (!author) {
      const a = firstTagText(block, ['author']);
      if (a) author = (a.match(/\(([^)]+)\)/) || [null, a])[1];
    }

    out.push({
      title: parsed.title,
      url: parsed.url,
      published_at: new Date(ms).toISOString(),
      author: author ? author.replace(/<[^>]+>/g, '').trim() || null : null,
    });
  }
  return out;
}

/**
 * Fetch every direct source once. NEVER throws: each source resolves to
 * { ok, fetched_at, entries, error }, and a failure is a value.
 *
 * `fetcher` is injectable for tests; production passes collector/fetch.mjs's
 * fetchText, which is the only HTTP path this repo allows.
 */
export async function fetchLeaderFeeds(sources = LEADER_SOURCES, { fetcher = fetchText, now = () => new Date() } = {}) {
  const results = {};
  const queue = [...sources];
  async function worker() {
    while (queue.length) {
      const src = queue.shift();
      const fetched_at = now().toISOString();
      try {
        const { data, headers } = await fetcher(src.url, { withMeta: true, retries: 0, timeoutMs: FEED_TIMEOUT_MS });
        assertXmlFeed(data, src.url, (headers && headers['content-type']) || '');
        const entries = parseLeaderFeed(data);
        if (!entries.length) throw new Error('feed parsed but carried no dated entries');
        results[src.id] = { ok: true, fetched_at, entries, error: null };
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        results[src.id] = { ok: false, fetched_at, entries: [], error: msg.slice(0, 200) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(FEED_CONCURRENCY, sources.length) }, worker));
  return results;
}

// Personal feeds keep their newest entries; org feeds keep only entries that
// attribute to someone on the roster. Enough to rebuild every line and the
// last-statement memory without committing a few hundred KB of other people's
// blog posts every hour.
const CACHE_PERSONAL_KEEP = 20;

/**
 * The direct feeds, asked at most once per COVERAGE_MIN_INTERVAL_MS. The fast
 * newsroom loop runs this script every minute; without the cache it would ask
 * two dozen blogs and YouTube for their feed sixty times an hour.
 *
 * Returns { feeds, cache, fetched } — `fetched` false means the cached
 * results were reused. NEVER throws.
 */
export async function cachedLeaderFeeds(sources, cache, { fetcher = fetchText, now = () => new Date(), force = false } = {}) {
  const nowMs = now().getTime();
  const ids = sources.map((s) => s.id).sort().join(',');
  const last = cache && Date.parse(cache.attempted_at);
  if (!force && cache && cache.sources_key === ids && cache.results && Number.isFinite(last) && nowMs - last < COVERAGE_MIN_INTERVAL_MS) {
    return { feeds: cache.results, cache, fetched: false };
  }
  const raw = await fetchLeaderFeeds(sources, { fetcher, now });
  const results = {};
  for (const src of sources) {
    const r = raw[src.id];
    if (!r) continue;
    if (!r.ok) {
      // A failed fetch keeps nothing: the row must read unreachable THIS run.
      results[src.id] = { ...r, entry_count: 0 };
      continue;
    }
    let kept;
    if (src.kind === 'personal') {
      kept = [...r.entries].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, CACHE_PERSONAL_KEEP);
    } else {
      const roster = ROSTER.filter((l) => src.leaders.includes(l.id));
      kept = r.entries.filter((e) => roster.some((l) => feedAttribution(l, src, e)));
    }
    results[src.id] = { ok: true, fetched_at: r.fetched_at, entries: kept, entry_count: r.entries.length, error: null };
  }
  const next = { schema: 1, attempted_at: now().toISOString(), min_interval_ms: COVERAGE_MIN_INTERVAL_MS, sources_key: ids, results };
  return { feeds: results, cache: next, fetched: true };
}

function shortHash(text) {
  return createHash('sha1').update(String(text)).digest('hex').slice(0, 12);
}

/**
 * Does this feed entry count as a statement BY this leader, and how?
 * Returns { cue, matched_alias } or null. See leader-sources.mjs for the rule.
 */
function feedAttribution(leader, src, entry) {
  const video = src.format === 'youtube';
  if (src.kind === 'personal') {
    return { cue: video ? 'own video' : 'own post', matched_alias: null };
  }
  if (entry.author) {
    const byline = namedLeaders(entry.author).find((n) => n.id === leader.id);
    if (byline) return { cue: 'byline', matched_alias: byline.alias };
  }
  const named = namedLeaders(entry.title).find((n) => n.id === leader.id);
  if (!named) return null;
  if (video) return { cue: 'official video', matched_alias: named.alias };
  if (speechCue(entry.title)) return { cue: 'official post', matched_alias: named.alias };
  return null;
}

/** Every entry, across this leader's direct sources, that counts as theirs. */
function feedLinesFor(leader, sources, feeds, clockMs) {
  const lines = [];
  for (const src of sources) {
    const res = feeds && feeds[src.id];
    if (!res || !res.ok) continue;
    for (const entry of res.entries) {
      const ms = isoMs(entry.published_at);
      if (ms === null || ms > clockMs + FUTURE_SKEW_MS) continue;
      const attr = feedAttribution(leader, src, entry);
      if (!attr) continue;
      lines.push({
        item_id: `feed-${src.id}-${shortHash(entry.url)}`,
        headline: entry.title,
        source: src.label,
        kind: 'official_feed',
        url: entry.url,
        published_at: entry.published_at,
        score: null,
        pillar: null,
        matched_alias: attr.matched_alias,
        cue: attr.cue,
        cue_group: 'direct',
        cue_class: 'official',
        cue_text: src.label,
        cues: [attr.cue],
        corroboration: 1,
        also_sources: [],
        via: 'feed',
        source_id: src.id,
      });
    }
  }
  return lines;
}

/** The remembered last statement from the previous data/leaders.json, if sane. */
function priorLast(prior, id, clockMs) {
  if (!prior || !Array.isArray(prior.leaders)) return null;
  const row = prior.leaders.find((l) => l && l.id === id);
  const last = row && row.last_statement;
  if (!last || typeof last !== 'object') return null;
  const ms = isoMs(last.published_at);
  if (ms === null || ms > clockMs + FUTURE_SKEW_MS) return null;
  if (typeof last.headline !== 'string' || typeof last.url !== 'string') return null;
  return {
    headline: last.headline, url: last.url, source: last.source ?? null,
    published_at: last.published_at, via: last.via ?? null, remembered: true,
  };
}

function lastFromLine(line) {
  return {
    headline: line.headline, url: line.url, source: line.source,
    published_at: line.published_at, via: line.via ?? 'press', remembered: false,
  };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function isoMs(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * One published line on the wire.
 *
 * `headline` is `item.title`, unmodified. The assertion below is not
 * decoration: it is the enforcement point for this module's absolute rule, and
 * it throws rather than warns for the same reason assertNoUrl() in posts.mjs
 * throws — a rule that can be ignored at 02:00 UTC is not a rule.
 */
function lineFrom(item, named, cue) {
  const headline = item.title;
  if (headline !== item.title) throw new Error('leaders: headline was modified');

  const corr = (item.meta && item.meta.corroboration) || {};
  return {
    item_id: item.id,
    headline,
    source: item.source,
    kind: item.kind ?? null,
    url: item.url,
    published_at: item.published_at,
    score: Number.isFinite(item.score) ? item.score : null,
    pillar: item.pillar ?? null,
    matched_alias: named.alias,
    cue: cue.cue,
    cue_group: cue.group,
    cue_class: cue.cue_class,
    cue_text: cue.text,
    cues: cue.all,
    corroboration: Number.isFinite(corr.count) ? corr.count : 1,
    also_sources: Array.isArray(corr.sources) ? [...corr.sources].sort() : [],
    via: 'press',
  };
}

/**
 * Reconcile against the watch floor (docs/RACE.md's loudness column).
 *
 * §3 of the brief: where race.mjs says `no_feed` and the wire has headlines,
 * the wire is right and should say where the line came from. Both facts are
 * true at once and neither is softened — the person publishes no feed we can
 * fetch AND the press carried them. `verdict` names which of the two sentences
 * a surface should lead with, so the homepage module and /leaders.html cannot
 * drift apart.
 */
function watchFloorFor(leader, lines, racePlayers) {
  const player = leader.race_player ? racePlayers.get(leader.race_player) : null;
  if (!player) {
    return {
      tracked: false,
      player_id: null,
      state: null,
      reason: null,
      feed: null,
      posts_30d: null,
      verdict: 'not_tracked',
      note: `${leader.name} is not a principal on the watch floor, so there is no loudness ` +
            `reading to contradict. These lines are the only reading we have.`,
    };
  }

  const loud = player.loudness || {};
  const state = loud.state ?? 'dark';
  const feed = loud.feed && loud.feed.label ? loud.feed.label : null;
  const silentFloor = state !== 'live';

  let verdict;
  if (silentFloor && lines.length) verdict = 'wire_fills_gap';
  else if (silentFloor) verdict = 'both_quiet';
  else if (lines.length) verdict = 'both_live';
  else verdict = 'floor_only';

  const sources = [...new Set(lines.map((l) => l.source))].sort();
  const note = verdict === 'wire_fills_gap'
    ? `The watch floor reads ${state.replace('_', ' ')} for ${leader.name} and that reading ` +
      `stands: it is about feeds we can fetch. ` +
      (lines.length === 1
        ? `The one line on the wire came from the press instead — ${sources.join(', ')} — and links `
          + `to the publication that printed it.`
        : `All ${lines.length} lines on the wire came from the press instead — ${sources.join(', ')} `
          + `— each linked to the publication that printed it.`)
    : verdict === 'both_quiet'
      ? `The watch floor reads ${state.replace('_', ' ')} and no headline in this window named ` +
        `${leader.name} beside a speech cue. Two separate silences, neither imputed from the other.`
      : verdict === 'both_live'
        ? `The watch floor reads live${feed ? ` on ${feed}` : ''} and the press carried ` +
          `${lines.length} line${lines.length === 1 ? '' : 's'} as well.`
        : `The watch floor reads live${feed ? ` on ${feed}` : ''}; no headline in this window ` +
          `named ${leader.name} beside a speech cue.`;

  return {
    tracked: true,
    player_id: player.id,
    player_name: player.name ?? null,
    state,
    reason: loud.reason ?? null,
    feed,
    posts_30d: Number.isFinite(loud.posts_30d) ? loud.posts_30d : null,
    verdict,
    note,
  };
}

/**
 * news.json (+ optional race.json) -> the leaders.json object.
 *
 * PURE. No clock, no randomness, no I/O: the output's `generated_at` is
 * news.json's own stamp, not this process's, so two runs over one corpus
 * produce a byte-identical file and site/build.mjs stays deterministic
 * (CONTRACT.md hard constraint 4). The cost is that leaders.json cannot tell
 * you when the leader pass ran, and the benefit is that git stays quiet unless
 * the news actually changed. `news_generated_at` is published separately so
 * the provenance is explicit rather than implied.
 */
export function buildLeaders(news, race = null, { feeds = null, prior = null, sources = LEADER_SOURCES, coverage = null, profiles = null, coverageMeta = null } = {}) {
  if (!news || !Array.isArray(news.items)) {
    throw new Error('leaders: news.json has no items array');
  }

  const clock = news.generated_at;
  const clockMs = isoMs(clock);
  if (clockMs === null) throw new Error(`leaders: unusable news.generated_at ${JSON.stringify(clock)}`);
  const windowStartMs = clockMs - WINDOW_DAYS * 86_400_000;

  const inWindow = news.items.filter((it) => {
    const ms = isoMs(it.published_at);
    return ms !== null && ms > windowStartMs;
  });

  const racePlayers = new Map(
    (race && Array.isArray(race.players) ? race.players : []).map((p) => [p.id, p]),
  );

  const byLeader = new Map(ROSTER.map((l) => [l.id, []]));
  let scanned = 0;
  let namedNoCue = 0;

  for (const item of inWindow) {
    if (typeof item.title !== 'string' || !item.title) continue;
    scanned += 1;
    const named = namedLeaders(item.title);
    if (!named.length) continue;
    const cue = speechCue(item.title);
    if (!cue) { namedNoCue += 1; continue; }
    for (const n of named) byLeader.get(n.id).push(lineFrom(item, n, cue));
  }

  const byNewest = (a, b) =>
    (isoMs(b.published_at) ?? 0) - (isoMs(a.published_at) ?? 0) ||
    (b.score ?? 0) - (a.score ?? 0) ||
    a.item_id.localeCompare(b.item_id);

  const leaders = ROSTER.map((leader) => {
    // Newest first. Score then id break the tie, both immutable for a given
    // item, so the ordering is total and stable across runs — the same cut key
    // discipline docs/NEWS.md §"Rolling window" settled on.
    const pressLines = byLeader.get(leader.id).sort(byNewest);

    // Direct sources: every attributable entry ever seen in the feed (for the
    // last-statement memory), and the ones inside the window (for the wire).
    const direct = sourcesFor(leader.id, sources);
    const feedAll = feedLinesFor(leader, direct, feeds, clockMs).sort(byNewest);
    const pressUrls = new Set(pressLines.map((l) => l.url));
    const feedInWindow = feedAll.filter((l) => isoMs(l.published_at) > windowStartMs && !pressUrls.has(l.url));
    const lines = [...pressLines, ...feedInWindow].sort(byNewest);

    const sourcesOut = [...new Set(lines.map((l) => l.source))].sort();

    // --- what "nothing this week" actually means for this person ----------
    const feedStatus = direct.map((src) => {
      const res = feeds ? feeds[src.id] : null;
      const mine = feedAll.filter((l) => l.source_id === src.id);
      return {
        id: src.id,
        label: src.label,
        kind: src.kind,
        format: src.format,
        url: src.url,
        verified: Boolean(src.verified),
        checked: Boolean(res),
        ok: Boolean(res && res.ok),
        error: res ? res.error : 'not checked this run',
        entries: res && res.ok ? (Number.isFinite(res.entry_count) ? res.entry_count : res.entries.length) : null,
        fetched_at: res ? res.fetched_at ?? null : null,
        attributed: res && res.ok ? mine.length : null,
        newest_attributed_at: mine.length ? mine[0].published_at : null,
      };
    });
    const directOk = feedStatus.filter((f) => f.ok).length;
    // The press wire is always one of the sources checked: data/news.json was
    // read, or this function would have thrown above.
    const sourcesChecked = direct.length + 1;
    const sourcesOk = directOk + 1;

    // The newest statement we know of, from the window, the feeds' full
    // history, or the previous run's memory — whichever is newest.
    const candidates = [];
    if (lines.length) candidates.push(lastFromLine(lines[0]));
    if (feedAll.length) candidates.push(lastFromLine(feedAll[0]));
    const remembered = priorLast(prior, leader.id, clockMs);
    if (remembered) candidates.push(remembered);
    candidates.sort((a, b) => (isoMs(b.published_at) ?? 0) - (isoMs(a.published_at) ?? 0) || a.url.localeCompare(b.url));
    const last = candidates.length ? candidates[0] : null;
    const lastMs = last ? isoMs(last.published_at) : null;
    const daysSilent = lastMs === null ? null : Math.max(0, Math.floor((clockMs - lastMs) / DAY_MS));

    let reason = null;
    if (!lines.length) {
      if (!direct.length) reason = 'no_sources';
      else if (!directOk) reason = 'sources_unreachable';
      else reason = 'quiet';
    }
    const group = lines.length ? 'on_record' : reason === 'sources_unreachable' ? 'unreachable' : 'quiet';

    return {
      id: leader.id,
      name: leader.name,
      initials: leader.initials,
      org: leader.org,
      org_id: leader.org_id,
      role: leader.role,
      aliases: [...leader.aliases],
      state: lines.length ? 'on_record' : 'no_line',
      count: lines.length,
      sources: sourcesOut,
      latest: lines.length ? lines[0] : null,
      lines,
      // The reconciliation is against THE PRESS, as it always was: the watch
      // floor measures feeds, so a line from a feed cannot "fill its gap".
      watch_floor: watchFloorFor(leader, pressLines, racePlayers),
      // ---- additive since matcher 1.1.0 ------------------------------------
      group,
      reason,
      press_count: pressLines.length,
      direct_count: feedInWindow.length,
      press_sources: [...new Set(pressLines.map((l) => l.source))].sort(),
      last_statement_at: last ? last.published_at : null,
      last_statement: last,
      days_silent: daysSilent,
      sources_checked: sourcesChecked,
      sources_ok: sourcesOk,
      direct_sources: feedStatus,
      no_source_reason: direct.length ? null : (NO_SOURCE_REASON[leader.id] ?? 'No official feed is known for this person.'),
      // ---- additive since matcher 1.2.0 ------------------------------------
      // Role/org as checked by hand (ROSTER), the Wikipedia profile, and press
      // COVERAGE — stories that mention the person. Coverage is never a
      // statement: it does not touch state, count, lines or last_statement.
      role_as_of: ROLE_AS_OF,
      profile: profiles && profiles[leader.id] ? profiles[leader.id] : null,
      coverage: coverage && coverage[leader.id] ? coverage[leader.id] : null,
    };
  });

  const onRecord = leaders.filter((l) => l.state === 'on_record');
  const feedIds = new Set(sources.filter((s) => s.leaders.some((id) => ROSTER_IDS.has(id))).map((s) => s.id));
  const feedsChecked = feeds ? [...feedIds].filter((id) => feeds[id]).length : 0;
  const feedsOk = feeds ? [...feedIds].filter((id) => feeds[id] && feeds[id].ok).length : 0;
  const times = inWindow.map((it) => isoMs(it.published_at)).filter((ms) => ms !== null);
  const oldest = times.length ? new Date(Math.min(...times)).toISOString() : null;
  const newest = times.length ? new Date(Math.max(...times)).toISOString() : null;

  return {
    schema: SCHEMA_VERSION,
    // news.json's clock, deliberately. See buildLeaders()'s note.
    generated_at: clock,
    news_generated_at: clock,
    matcher_version: MATCHER_VERSION,
    window_days: WINDOW_DAYS,
    window_start: new Date(windowStartMs).toISOString(),
    // Published with the numbers, the way docs/NEWS.md publishes its scoring
    // block: the vocabulary that produced these matches travels with them, so
    // a reader never has to match a file against a commit to recompute it.
    rule: {
      headline_only: true,
      statement:
        'Only the headline is ever reproduced, exactly as the publication printed it. ' +
        'No quotation is generated, paraphrased, summarised or reconstructed anywhere in this file.',
      match: 'The headline names a roster member (whole word, published alias table) AND carries a speech cue.',
      match_direct:
        'Or: the entry was published on the person\'s own feed, or on their organisation\'s official feed ' +
        'with them as the author or named in the title (with a speech cue, or as an official video upload).',
      no_line_means:
        'No headline in this corpus named this person beside a speech cue. It is not a claim ' +
        'that the person said nothing.',
    },
    cues: {
      core: [...CUES_CORE],
      extended: [...CUES_EXTENDED],
      quoted_text: 'double quotes, two words or more',
      classes: Object.fromEntries(Object.entries(CUE_CLASS).map(([k, v]) => [k, [...v]])),
      class_means: {
        verb: 'the headline\'s own verb is an act of speech',
        appearance: 'the headline names a venue or a format — interview, podcast, keynote, testimony',
        document: 'a document names the person. It may be by them or about them; the headline is the only thing that can tell you, and it is printed in full',
        quote: 'the publication put words in quotation marks in its own headline',
        official: 'not a press headline: the title of an entry on the person\'s own feed, or on their organisation\'s official feed under their name',
      },
    },
    corpus: {
      source: 'data/news.json',
      items: news.items.length,
      items_in_window: inWindow.length,
      scanned,
      max_items: news.max_items ?? null,
      window_binds: Number.isFinite(news.max_items) && news.items.length >= news.max_items,
      oldest_item_at: oldest,
      newest_item_at: newest,
      named_without_cue: namedNoCue,
    },
    cross_check: {
      source: 'data/race.json',
      present: Boolean(race),
      race_generated_at: race ? race.generated_at ?? null : null,
      players_matched: leaders.filter((l) => l.watch_floor.tracked).length,
      // The §3 reconciliation, counted: how many people the press can hear
      // that the feed probe cannot.
      wire_fills_gap: leaders.filter((l) => l.watch_floor.verdict === 'wire_fills_gap').map((l) => l.id),
    },
    totals: {
      leaders: leaders.length,
      on_record: onRecord.length,
      no_line: leaders.length - onRecord.length,
      lines: leaders.reduce((n, l) => n + l.count, 0),
      distinct_items: new Set(leaders.flatMap((l) => l.lines.map((x) => x.item_id))).size,
      // additive since matcher 1.1.0
      quiet: leaders.filter((l) => l.group === 'quiet').length,
      unreachable: leaders.filter((l) => l.group === 'unreachable').length,
      no_sources: leaders.filter((l) => l.reason === 'no_sources').length,
      press_lines: leaders.reduce((n, l) => n + l.press_count, 0),
      direct_lines: leaders.reduce((n, l) => n + l.direct_count, 0),
    },
    direct: {
      source: 'collector/leader-sources.mjs',
      ran: Boolean(feeds),
      feeds_configured: feedIds.size,
      feeds_checked: feedsChecked,
      feeds_ok: feedsOk,
      reasons: [...SILENCE_REASONS],
      reason_means: {
        quiet: 'At least one official source answered, and neither it nor the press carried anything from this person in the window.',
        sources_unreachable: 'This person has official sources and none of them answered this run, so the silence may be ours rather than theirs.',
        no_sources: 'No official feed is known for this person; the press wire is the only reading.',
      },
      last_statement_means:
        'The newest dated statement this wire has ever attributed to the person — from the press window, ' +
        'the full history of their official feeds, or the memory carried forward from previous runs.',
    },
    coverage: coverageBlock(leaders, coverageMeta),
    leaders,
  };
}

/** The top-level description of the coverage layer, and its totals. */
function coverageBlock(leaders, meta) {
  const rows = leaders.map((l) => l.coverage).filter(Boolean);
  const ok = rows.filter((c) => c.state === 'ok' || c.state === 'stale');
  const sum = (k) => ok.reduce((n, c) => n + (Number.isFinite(c[k]) ? c[k] : 0), 0);
  return {
    source: 'Google News search RSS (news.google.com/rss/search), one exact-phrase query per person',
    is_statement: false,
    means:
      'Stories in the press that mention the person, counted as distinct (title, outlet) pairs ever ' +
      'observed. Coverage is not a statement: it never puts anyone on the record, and only the ' +
      'outlet\'s own headline is shown.',
    generated_at: meta && meta.generated_at ? meta.generated_at : null,
    min_interval_minutes: COVERAGE_MIN_INTERVAL_MS / 60_000,
    days: COVERAGE_DAYS,
    ran: Boolean(meta && meta.ran),
    polled: meta && Array.isArray(meta.polled) ? meta.polled.length : 0,
    leaders_with_data: ok.length,
    leaders_dark: rows.filter((c) => c.state === 'dark').length,
    total_24h: ok.length ? sum('count_24h') : null,
    total_7d: ok.length ? sum('count_7d') : null,
    trend_means:
      'Week over week: this 7 days against the 7 before. Shown only once a full previous week has ' +
      'been observed; flat inside ±10% or ±2 stories.',
    profile_source: 'Wikipedia REST summary (en.wikipedia.org/api/rest_v1/page/summary), CC BY-SA 4.0, refreshed at most daily',
    profile_min_interval_hours: PROFILE_MIN_INTERVAL_MS / 3_600_000,
    role_as_of: ROLE_AS_OF,
  };
}

/**
 * A digest of everything a reader can see on /leaders.html, so the fast
 * newsroom loop can tell "the leader page changed" from "news.json's clock
 * moved" without diffing two whole files. Counts are part of it; timestamps
 * that only move with the clock are not.
 */
export function leadersFingerprint(out) {
  const visible = out.leaders.map((l) => [
    l.id, l.state, l.lines.map((x) => x.item_id), l.last_statement && l.last_statement.url, l.reason,
    l.direct_sources.map((f) => f.ok),
    l.profile && [l.profile.description, l.profile.extract],
    l.coverage && [l.coverage.state, l.coverage.count_24h, l.coverage.count_7d, l.coverage.trend && l.coverage.trend.dir,
      (l.coverage.headlines || []).map((h) => h.url), (l.coverage.daily || []).map((d) => d.n)],
  ]);
  return createHash('sha256').update(JSON.stringify(visible)).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function readJson(url, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (err) {
    if (optional && err && err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeJsonFile(url, obj, { compact = false } = {}) {
  await mkdir(new URL('./', url), { recursive: true });
  // The coverage memory is mostly [hash, minute] pairs: one per line keeps the
  // hourly git diff readable without pretty-printing every pair over 4 lines.
  const text = compact
    ? JSON.stringify(obj).replace(/\],\[/g, '],\n[')
    : JSON.stringify(obj, null, 2);
  await writeFile(url, `${text}\n`, 'utf8');
}

function pad(text, width) {
  const s = String(text);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function clip(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function silenceText(l) {
  const last = l.last_statement_at ? `last ${l.last_statement_at.slice(0, 10)}` : 'never seen';
  return `${l.reason} · ${last} · ${l.sources_ok}/${l.sources_checked} sources answered`;
}

function printTable(out) {
  const head = ['leader', 'org', 'n', 'cue', 'class', 'src', 'latest headline (verbatim)'];
  const w = [22, 16, 3, 11, 10, 12, 58];
  console.log('');
  console.log(head.map((h, i) => pad(h, w[i])).join('  '));
  console.log(w.map((n) => '-'.repeat(n)).join('  '));

  for (const l of out.leaders) {
    const latest = l.latest;
    const row = [
      pad(clip(l.name, w[0]), w[0]),
      pad(clip(l.org, w[1]), w[1]),
      pad(l.count, w[2]),
      pad(latest ? clip(latest.cue, w[3]) : '—', w[3]),
      pad(latest ? clip(latest.cue_class, w[4]) : '—', w[4]),
      pad(latest ? clip(latest.source, w[5]) : '—', w[5]),
      latest ? clip(latest.headline, w[6]) : silenceText(l),
    ];
    console.log(row.join('  '));
  }
}

function parseArgs(argv) {
  const args = { offline: false, force: false, adopt: null, out: OUTPUT_URL, prior: OUTPUT_URL };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--offline') args.offline = true;
    else if (a === '--force') args.force = true;
    else if (a === '--out' || a === '--prior') {
      const v = argv[i + 1];
      if (!v) throw new Error(`${a} needs a path`);
      args[a.slice(2)] = new URL(a === '--adopt' && !v.endsWith('/') ? `${v}/` : v, `file://${process.cwd()}/`);
      i += 1;
    } else throw new Error(`unknown argument ${JSON.stringify(a)}. Usage: node collector/leaders.mjs [--offline] [--force] [--adopt DIR] [--out FILE] [--prior FILE]`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const news = await readJson(NEWS_URL);
  const race = await readJson(RACE_URL, { optional: true });

  // The previous output is the rolling memory of each person's last statement.
  // Unreadable or absent is fine: the memory starts again from the feeds.
  let prior = null;
  try { prior = await readJson(args.prior, { optional: true }); }
  catch (err) { console.warn(`leaders: previous output unreadable (${err.message}); starting memory fresh`); }

  // Caches: unreadable or absent is fine, the memory starts again.
  const readCache = async (url, what) => {
    try { return await readJson(url, { optional: true }); }
    catch (err) { console.warn(`leaders: ${what} unreadable (${err.message}); starting fresh`); return null; }
  };
  let feedCache = await readCache(FEEDS_CACHE_URL, 'feed cache');
  let covCache = await readCache(COVERAGE_URL, 'coverage memory');
  let profCache = await readCache(PROFILES_URL, 'profile cache');

  // --adopt DIR: fold in another lane's copy of the three caches (the fast
  // newsroom loop passes main's), so a search another lane ran minutes ago is
  // not run again here. See adoptCoverage().
  if (args.adopt) {
    const other = async (name) => readCache(new URL(name, args.adopt), `adopted ${name}`);
    covCache = adoptCoverage(covCache, await other('leaders-coverage.json'));
    profCache = adoptProfiles(profCache, await other('leaders-profiles.json'));
    const f = await other('leaders-feeds.json');
    if (f && f.results && (!feedCache || Date.parse(f.attempted_at) > Date.parse(feedCache.attempted_at || 0))) feedCache = f;
  }

  const now = new Date();
  let feeds = null;
  let covNext = covCache;
  let profNext = profCache;
  let polled = [];
  if (!args.offline) {
    const covSpecs = ROSTER.map((l) => ({ id: l.id, ...l.news_query }));
    const profSpecs = ROSTER.map((l) => ({ id: l.id, title: l.wikipedia }));
    // Three independent failure domains, run side by side. None can throw.
    const [f, c, p] = await Promise.all([
      cachedLeaderFeeds(LEADER_SOURCES, feedCache, { force: args.force }),
      refreshCoverage(covSpecs, covCache, { force: args.force }),
      refreshProfiles(profSpecs, profCache, { force: args.force }),
    ]);
    feeds = f.feeds;
    covNext = c.cache;
    profNext = p;
    polled = c.polled;
    if (f.fetched) await writeJsonFile(FEEDS_CACHE_URL, f.cache);
    console.log(`direct feeds: ${f.fetched ? 'fetched' : 'cached (asked < 15 min ago)'}; ` +
                `coverage: ${c.polled.length} polled, ${c.skipped.length} skipped (asked < 15 min ago)`);
  } else if (feedCache && feedCache.results) {
    // Offline still shows the last known reading, labelled with its own stamps.
    feeds = feedCache.results;
  }

  const nowMs = now.getTime();
  const coverage = Object.fromEntries(ROSTER.map((l) => [l.id,
    coverageView({ id: l.id, ...l.news_query }, covNext && covNext.leaders ? covNext.leaders[l.id] : null, nowMs, { checked: !args.offline })]));
  const profiles = Object.fromEntries(ROSTER.map((l) => [l.id,
    profileView({ id: l.id, title: l.wikipedia }, profNext && profNext.leaders ? profNext.leaders[l.id] : null)]));

  const out = buildLeaders(news, race, {
    feeds, prior, coverage, profiles,
    coverageMeta: { generated_at: now.toISOString(), ran: !args.offline, polled },
  });
  out.fingerprint = leadersFingerprint(out);

  if (!args.offline) {
    if (covNext) await writeJsonFile(COVERAGE_URL, covNext, { compact: true });
    if (profNext) await writeJsonFile(PROFILES_URL, profNext);
  }
  await mkdir(new URL('./', args.out), { recursive: true });
  await writeFile(args.out, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  printTable(out);

  const core = out.leaders.flatMap((l) => l.lines).filter((l) => l.cue_group === 'core').length;
  const ext = out.totals.lines - core;

  console.log('');
  console.log(`corpus: ${out.corpus.items_in_window}/${out.corpus.items} items inside the ${out.window_days}d window` +
              (out.corpus.window_binds ? ` (the ${out.corpus.max_items}-item cap binds before the window does)` : ''));
  console.log(`${out.totals.on_record}/${out.totals.leaders} leaders on the record, ` +
              `${out.totals.no_line} with nothing on the record this week`);
  console.log(`${out.totals.lines} lines across ${out.totals.distinct_items} distinct items ` +
              `(${core} matched a core cue, ${ext} an extended one)`);
  console.log(`${out.corpus.named_without_cue} headline(s) named a leader but carried no speech cue — excluded`);

  if (!race) {
    console.log('cross-check: data/race.json absent — watch_floor is "not tracked" on every row');
  } else {
    const gap = out.cross_check.wire_fills_gap;
    console.log(`cross-check: ${out.cross_check.players_matched}/${out.totals.leaders} leaders are watch-floor principals; ` +
                `the wire fills the gap for ${gap.length}${gap.length ? ` (${gap.join(', ')})` : ''}`);
  }
  console.log(out.direct.ran
    ? `direct sources: ${out.direct.feeds_ok}/${out.direct.feeds_configured} official feeds answered; ` +
      `${out.totals.direct_lines} line(s) in the window came from them`
    : 'direct sources: skipped (--offline)');
  console.log(`groups: ${out.totals.on_record} on record, ${out.totals.quiet} quiet, ${out.totals.unreachable} unreachable ` +
              `(${out.totals.no_sources} with no official source at all)`);
  const cv = out.coverage;
  console.log(`coverage: ${cv.leaders_with_data}/${out.totals.leaders} with data, ${cv.leaders_dark} dark` +
              (cv.total_7d !== null ? `, ${cv.total_7d} stories in 7d` : ''));
  for (const l of out.leaders) {
    const c = l.coverage;
    if (c && c.error && c.state !== 'ok') console.log(`  ${pad(l.id, 12)} coverage ${c.state}: ${c.error}`);
    const p = l.profile;
    if (p && p.error) console.log(`  ${pad(l.id, 12)} profile ${p.state}: ${p.error}`);
  }
  console.log(`fingerprint ${out.fingerprint}`);
  console.log(`wrote ${args.out.pathname} — ${out.totals.leaders} rows, roster order, never pruned`);

  // Exit zero on an empty week. A week in which nobody quotable said anything
  // quotable is a real reading and the file is still the right file; failing
  // the workflow over it would teach the operator to ignore a red run.
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`leaders: fatal — ${err && err.message ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}

export { ROSTER, CUES_CORE, CUES_EXTENDED, CUE_CLASS, WINDOW_DAYS, MATCHER_VERSION, SILENCE_REASONS };
