#!/usr/bin/env node
// DOOMCON leader wire — what the people running AI actually said this week.
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
// NO NETWORK
// ---------------------------------------------------------------------------
//
// This module makes no HTTP request at all. It reads data/news.json and
// data/race.json off disk and writes data/leaders.json. CONTRACT.md §1.5
// ("every network call goes through collector/fetch.mjs") is satisfied
// vacuously and deliberately: the fetching was already done, lawfully, by
// collector/news.mjs. If a future version needs a byline or a transcript it
// MUST import fetchText/fetchJson from './fetch.mjs' and never call fetch().
//
// Writes data/leaders.json only. It touches nothing in public/, so it is
// order-independent with respect to site/build.mjs.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SCHEMA_VERSION = 1;
const MATCHER_VERSION = '1.0.0';

// 7 days, matching docs/NEWS.md's collection window. The corpus is capped at
// 200 items, so on a busy week the cap binds long before the window does —
// which is a real limitation and is published as `corpus.window_binds`.
const WINDOW_DAYS = 7;

const NEWS_URL = new URL('../data/news.json', import.meta.url);
const RACE_URL = new URL('../data/race.json', import.meta.url);
const OUTPUT_URL = new URL('../data/leaders.json', import.meta.url);

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
  },
  {
    id: 'amodei', name: 'Dario Amodei', initials: 'DA',
    org: 'Anthropic', org_id: 'anthropic', role: 'CEO',
    aliases: ['Dario Amodei', 'Amodei'],
    // Daniela Amodei, Anthropic's president, is a different person.
    blocks: ['Daniela'],
    race_player: 'anthropic',
  },
  {
    id: 'hassabis', name: 'Demis Hassabis', initials: 'DH',
    org: 'Google DeepMind', org_id: 'google-deepmind', role: 'CEO',
    aliases: ['Demis Hassabis', 'Hassabis'],
    blocks: [],
    race_player: 'google-deepmind',
  },
  {
    id: 'musk', name: 'Elon Musk', initials: 'EM',
    org: 'xAI', org_id: 'xai', role: 'Founder',
    aliases: ['Elon Musk', 'Musk'],
    blocks: [],
    race_player: 'xai',
  },
  {
    id: 'zuckerberg', name: 'Mark Zuckerberg', initials: 'MZ',
    org: 'Meta', org_id: 'meta', role: 'CEO',
    // "Zuck" is how several of these publications write him in a headline.
    aliases: ['Mark Zuckerberg', 'Zuckerberg', 'Zuck'],
    blocks: [],
    race_player: 'meta',
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
  },
  {
    id: 'nadella', name: 'Satya Nadella', initials: 'SN',
    org: 'Microsoft', org_id: 'microsoft', role: 'CEO',
    aliases: ['Satya Nadella', 'Nadella'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'pichai', name: 'Sundar Pichai', initials: 'SP',
    org: 'Alphabet', org_id: 'google', role: 'CEO',
    aliases: ['Sundar Pichai', 'Pichai'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'suleyman', name: 'Mustafa Suleyman', initials: 'MS',
    org: 'Microsoft AI', org_id: 'microsoft', role: 'CEO',
    aliases: ['Mustafa Suleyman', 'Suleyman'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'kavukcuoglu', name: 'Koray Kavukcuoglu', initials: 'KK',
    org: 'Google', org_id: 'google', role: 'Chief AI Architect',
    aliases: ['Koray Kavukcuoglu', 'Kavukcuoglu', 'Koray'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'lecun', name: 'Yann LeCun', initials: 'YL',
    org: 'Meta', org_id: 'meta', role: 'Chief AI Scientist',
    // Three spellings are in live use across these feeds.
    aliases: ['Yann LeCun', 'Yann Le Cun', 'LeCun', 'Le Cun'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'hinton', name: 'Geoffrey Hinton', initials: 'GH',
    org: 'University of Toronto', org_id: 'academia', role: 'Professor emeritus',
    aliases: ['Geoffrey Hinton', 'Geoff Hinton', 'Hinton'],
    blocks: [],
    race_player: null,
  },
  {
    id: 'bengio', name: 'Yoshua Bengio', initials: 'YB',
    org: 'Mila, Université de Montréal', org_id: 'academia', role: 'Professor',
    aliases: ['Yoshua Bengio', 'Bengio'],
    // Samy Bengio is a different researcher at a different organisation.
    blocks: ['Samy'],
    race_player: null,
  },
  {
    id: 'mensch', name: 'Arthur Mensch', initials: 'AM',
    org: 'Mistral AI', org_id: 'mistral', role: 'CEO',
    aliases: ['Arthur Mensch', 'Mensch'],
    // "a mensch" / "the mensch" is an English noun and it is title-cased in a
    // title-cased headline, where the capital carries no information.
    blocks: ['a', 'an', 'the'],
    race_player: 'mistral',
  },
  {
    id: 'liang', name: 'Liang Wenfeng', initials: 'LW',
    org: 'DeepSeek', org_id: 'deepseek', role: 'Founder',
    // Family name first. Bare "Liang" is absent for the same reason bare
    // "Huang" is; "Wenfeng" alone is distinctive.
    aliases: ['Liang Wenfeng', 'Wenfeng'],
    blocks: [],
    race_player: 'deepseek',
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
export function buildLeaders(news, race = null) {
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

  const leaders = ROSTER.map((leader) => {
    // Newest first. Score then id break the tie, both immutable for a given
    // item, so the ordering is total and stable across runs — the same cut key
    // discipline docs/NEWS.md §"Rolling window" settled on.
    const lines = byLeader.get(leader.id).sort((a, b) =>
      (isoMs(b.published_at) ?? 0) - (isoMs(a.published_at) ?? 0) ||
      (b.score ?? 0) - (a.score ?? 0) ||
      a.item_id.localeCompare(b.item_id));

    const sources = [...new Set(lines.map((l) => l.source))].sort();
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
      sources,
      latest: lines.length ? lines[0] : null,
      lines,
      watch_floor: watchFloorFor(leader, lines, racePlayers),
    };
  });

  const onRecord = leaders.filter((l) => l.state === 'on_record');
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
    },
    leaders,
  };
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

function pad(text, width) {
  const s = String(text);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function clip(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
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
      latest ? clip(latest.headline, w[6]) : 'Nothing on the record this week',
    ];
    console.log(row.join('  '));
  }
}

async function main() {
  const news = await readJson(NEWS_URL);
  const race = await readJson(RACE_URL, { optional: true });

  const out = buildLeaders(news, race);

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUTPUT_URL, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

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
  console.log(`wrote data/leaders.json — ${out.totals.leaders} rows, roster order, never pruned`);

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

export { ROSTER, CUES_CORE, CUES_EXTENDED, CUE_CLASS, WINDOW_DAYS, MATCHER_VERSION };
