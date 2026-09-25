// DOOMCON news layer — event clustering and incident severity.
//
// THE BUG THIS FILE EXISTS TO FIX, stated first because it shapes every rule
// below.
//
// collector/news.mjs computes corroboration by CANONICAL URL (plus an explicit
// dedup key, plus a near-identical-title pass at 0.75 containment). Those three
// passes find the same PAGE arriving through two feeds. They do not find the
// same EVENT reported by four newsrooms in four different sentences, because
// four newsrooms write four different headlines and publish them at four
// different URLs.
//
// Measured on the live corpus of 2026-09-24/25, the Australian Medicare
// incident was carried by arstechnica-ai, techmeme (twice) and verge-ai. Under
// URL-matching it was four separate items, every one of them scoring
// `corroboration 0` — the single heaviest term in the formula — and the best of
// them ranked 97th of 200.
//
// The failure is not merely a miss; it is INVERTED. A big story attracts more
// outlets, more outlets means more distinct URLs, and more distinct URLs means
// more fragmentation. Under URL-matching, the more independent confirmation an
// event gets, the lower every report of it scores. Corroboration is the one
// thing a single-source competitor structurally cannot compute (docs/NEWS.md,
// opening), and it was backwards on exactly the stories it exists for.
//
// SO: this is a post-pass over the 200-item window. It groups items that
// describe ONE EVENT into a STORY, scores how severe that event is, and
// publishes both — with the words that linked each pair, so a reader can audit
// a cluster instead of trusting it. A wrong merge is worse than a missed one,
// and every rule below is biased accordingly.
//
// It runs AFTER the membership cut in news.mjs, never before. Membership is cut
// on (published_at, id) precisely so it cannot depend on score (docs/NEWS.md,
// "Rolling window and idempotency"); clustering changes scores, so it has to
// happen downstream of a window that is already fixed.
//
// No network, no clock of its own, no randomness: a pure function of the items
// array and the run's generated_at. CONTRACT.md §4.

import { createHash } from 'node:crypto';

export const STORY_RULES_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Constants — all published into data/news.json so the numbers travel with the
// rules that produced them, the same treatment docs/NEWS.md gives `scoring`.
// ---------------------------------------------------------------------------

export const CLUSTER = Object.freeze({
  // Two reports of one event land within days. This is the same 96h guard
  // news.mjs already applies to its title pass, for the same reason: an
  // identical headline four days later is a recurring headline, not one story.
  WINDOW_HOURS: 96,
  // Ordinary link: three distinctive words in common.
  SHARED_WORDS: 3,
  // Both sides are incidents: two words. An incident is a narrower class of
  // story than "AI news", so two words carry more evidence inside it.
  INCIDENT_SHARED_WORDS: 2,
  // One side carries a strong containment signal and the other is a
  // full-strength incident: one word. This is the only single-word link in the
  // file and it is fenced by BOTH severity tests plus the non-entity guard.
  SIGNAL_SHARED_WORDS: 1,
  INCIDENT_MIN_SEVERITY: 0.6,
  FULL_STRENGTH_SEVERITY: 1.0,
  // A shared word that is only a company, product or publication name is not
  // evidence of a shared event. "OpenAI" appears in 20+ unrelated headlines in
  // any week's corpus and "Bloomberg" in a dozen. Every link must rest on at
  // least one word that is not a name.
  MIN_NON_ENTITY_WORDS: 1,
  // …and the ORDINARY three-word rule needs two of them. Measured on the live
  // corpus of 2026-09-24: at one non-entity word the rule merged
  // `anthropics/claude-code v2.1.282` with an Anthropic enzyme-discovery story
  // on {anthropic, claude, code}, and two unrelated OpenAI items on
  // {chatgpt, openai, power}. Both are three shared words of which only one
  // carries any event in it. The incident rules keep the floor at one, because
  // they are already fenced by two severity tests.
  SHARED_NON_ENTITY_WORDS: 2,
});

export const SEVERITY_WEIGHTS = Object.freeze({ a: 1.0, b: 0.6, c: 0.3 });

// A headline is the publication's own claim about what the story IS. A summary
// is context, and it routinely mentions an incident that is not this item's
// subject ("...unlike the breach reported last month"). So the summary counts,
// at just over a third.
export const SEVERITY_SUMMARY_FACTOR = 0.35;

// The severity table. Surface forms, not stems — they are stemmed at load, and
// spelling them out is what lets a reader check the table against the text.
//
// Tier A is loss of control or loss of data: something happened that was not
// supposed to be possible.
// Tier B is adversarial activity and deliberate stops: something was attempted,
// or something was halted.
// Tier C is the paperwork that follows: an investigation, a disclosure, an
// incident report. Real signal, a third of the weight.
// MATCHED AS EXACT SURFACE FORMS, not as stems, and this is the single most
// important decision in the table.
//
// Stemming the severity list was the first implementation and it was wrong in a
// way that would have discredited the whole feature. `hackers` stems to
// `hacker`, `hacked` stems to `hack` — so the string "Hacker News", which
// appears in the summary of EVERY hn-ai item ("81 points, 143 comments on
// Hacker News."), fired tier A. Measured on the live corpus of 2026-09-24:
// 32 of 39 items with any severity at all scored it on the words "Hacker News",
// including "AI Workers' Inquiry 2026" and "Restaurants Are Using AI to
// Advertise Their Food".
//
// Surface matching costs an explicit inflection list and buys a table a reader
// can check against the headline word by word. `hacked` fires; `hacker` does
// not. Bare `hack` is deliberately absent: on this corpus it is the Hacker News
// sense of the word, not the intrusion sense, and `breach` / `unauthorized`
// catch the real thing anyway.
export const SEVERITY_TERMS = Object.freeze({
  a: Object.freeze([
    'rogue', 'escaped', 'escaping', 'containment', 'uncontained',
    'unauthorized', 'unauthorised',
    'breach', 'breached', 'breaches',
    'hacked', 'hacking', 'hacks',
    'cyberattack', 'cyberattacks',
    'exfiltration', 'exfiltrated', 'exfiltrating',
    'compromised',
  ]),
  b: Object.freeze([
    'attack', 'attacks', 'attacked', 'attacking',
    'exploit', 'exploits', 'exploited',
    'sabotage', 'sabotaged',
    'jailbreak', 'jailbreaks', 'jailbroken', 'jailbreaking',
    'leak', 'leaks', 'leaked', 'leaking',
    'shutdown', 'shutdowns', 'paused', 'pause', 'suspended',
    'malware', 'ransomware', 'phishing',
  ]),
  c: Object.freeze([
    'investigation', 'investigations', 'investigating', 'investigated',
    'disclosure', 'disclosures', 'disclosed',
    'incident', 'incidents',
    'probe', 'lawsuit', 'subpoena',
  ]),
});

// Multi-word severity terms, matched against consecutive stems.
export const SEVERITY_PHRASES = Object.freeze({
  a: Object.freeze([
    'self replication', 'self replicating', 'self exfiltration',
    'broke containment', 'escaped containment', 'gained access',
  ]),
  b: Object.freeze(['shut down', 'taken offline', 'denial of service']),
  c: Object.freeze(['under investigation', 'responsible disclosure']),
});

// The escalation vocabulary. A headline carrying one of these is not merely
// severe, it is making the specific claim this index was built to notice: that
// something got out. They are all tier A anyway; what this set buys is the
// one-shared-word link in linkRule().
export const STRONG_SIGNALS = Object.freeze([
  'rogue', 'escaped', 'escaping', 'containment', 'uncontained',
  'self replication', 'self replicating', 'self exfiltration',
]);

// Points. Published, like every other constant in this layer.
export const STORY_SCORE = Object.freeze({
  SEVERITY_MAX: 15,          // severity component = 15 x severity
  COVERAGE_PER_SOURCE: 5,    // per distinct story source beyond the item's own
  COVERAGE_MAX: 15,
});

// How many near-miss pairs are published for audit. Capped because
// data/news.json is served to phones (docs/NEWS.md, MAX_ITEMS).
const NEAR_MISS_PUBLISHED = 12;

// ---------------------------------------------------------------------------
// Stemming
//
// A hand-written suffix stripper, not Porter. Two reasons, both about this
// corpus: Porter is 60 lines of rules a reader will not check, and the only
// thing required here is that two spellings of one word collapse to one token.
// The output is not required to be a word — `investigat` is fine — it is
// required to be the SAME token on both sides of a comparison.
// ---------------------------------------------------------------------------

const SUFFIXES = [
  ['ational', 'at'], ['ization', 'iz'], ['iveness', 'iv'], ['fulness', 'ful'],
  ['ousness', 'ous'], ['ation', 'at'], ['ement', ''], ['ments', 'ment'],
  ['ness', ''], ['ies', 'y'], ['ing', ''], ['ure', ''], ['ers', 'er'],
  ['ed', ''], ['es', ''], ['s', ''], ['e', ''],
];

const STEM_ROUNDS = 3;

/**
 * Deterministic suffix stem. British -ise spellings fold into -ize first.
 *
 * APPLIED REPEATEDLY, up to three rounds, because one pass is not confluent and
 * a stemmer that is not confluent silently fails to match. `valuations` strips
 * to `valuation` on the first pass and only reaches `valuat` on the second,
 * while `valuation` gets there in one — so a single pass gives one word two
 * tokens, and two headlines about the same funding round do not match on it.
 * Three rounds is enough for every suffix chain in this table.
 */
export function stem(word) {
  let w = String(word);
  for (let round = 0; round < STEM_ROUNDS; round++) {
    if (w.length <= 3) return w;
    // -ise/-isation are the same word as -ize/-ization and must not be two tokens.
    const normalised = w.replace(/isation$/, 'ization').replace(/ise$/, 'ize')
      .replace(/ised$/, 'ized').replace(/ising$/, 'izing').replace(/ises$/, 'izes');
    let next = normalised;
    for (const [suffix, replacement] of SUFFIXES) {
      if (!normalised.endsWith(suffix)) continue;
      // `ss` is not a plural. Never strip it, or "access" becomes "acce".
      if (suffix === 's' && normalised.endsWith('ss')) continue;
      const base = normalised.slice(0, normalised.length - suffix.length) + replacement;
      if (base.length >= 3) { next = base; break; }
    }
    if (next === w) return w;
    w = next;
  }
  return w;
}

// Techmeme ends almost every headline with its sourcing credit —
// `(Todd Bishop/GeekWire)`, `(The Age)`, `(Shakeel Hashim/Transformer)`. That
// parenthetical is a byline, not the event, and leaving it in produced real
// false merges on the live corpus of 2026-09-24: an Amazon Seller Central story
// and a Microsoft reorg were linked on {bishop, geekwire, todd}, which is the
// name of the reporter who wrote both.
//
// Stripped only when it terminates the string and is short enough to be a
// credit rather than a clause. A real headline that ends in a parenthetical
// aside loses a couple of words from its distinctive set, which costs a link it
// would have made on other words anyway.
const TRAILING_CREDIT = /\s*\(([^()]{1,60})\)\s*$/;

/** The title as the clustering rules see it: the publication's credit removed. */
export function clusterTitle(title) {
  const t = String(title ?? '').trim();
  const m = t.match(TRAILING_CREDIT);
  if (!m) return t;
  if (m[1].split(/\s+/).length > 8) return t;
  const stripped = t.slice(0, t.length - m[0].length).trim();
  // Never strip a title down to nothing — a headline that is ONLY a
  // parenthetical is not a credit, it is the headline.
  return stripped.length >= 12 ? stripped : t;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

// Structural words plus the contraction fragments an apostrophe-stripping
// tokenizer produces. "didn" is not evidence that two newsrooms saw one event;
// it is evidence that both wrote "didn't".
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that',
  'these', 'those', 'you', 'your', 'we', 'our', 'us', 'they', 'them', 'their', 'has', 'have',
  'had', 'new', 'now', 'how', 'why', 'what', 'who', 'whom', 'when', 'where', 'can', 'could',
  'into', 'out', 'up', 'down', 'over', 'about', 'via', 'says', 'said', 'say', 'just', 'more',
  'most', 'than', 'then', 'there', 'here', 'after', 'before', 'not', 'no', 'yes', 'all', 'any',
  // Number words, for the same reason bare digits are dropped: a quantity is
  // not an event. Measured on the live corpus of 2026-09-24, "seven
  // co-founders" and "seven years" linked two unrelated Anthropic stories.
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'dozen', 'hundred', 'thousand', 'second', 'third',
  'first', 'last', 'some', 'such', 'only', 'own', 'same', 'his', 'her',
  'him', 'she', 'he', 'my', 'me', 'per', 'off', 'still', 'also', 'may', 'might', 'would',
  'should', 'will', 'does', 'did', 'done', 'get', 'got', 'make', 'made', 'take', 'takes',
  // contraction tails
  'didn', 'don', 'doesn', 'isn', 'aren', 'wasn', 'weren', 'won', 'can', 'couldn', 'shouldn',
  'wouldn', 'hasn', 'haven', 'hadn', 'ain', 'let', 'll', 've', 're',
]);

// Generic AI vocabulary. Every one of these is in the majority of headlines in
// this corpus, so none of them distinguishes one event from another. Dropping
// them is what stops "AI model agents" merging the whole reel.
//
// This deliberately overlaps AI_TOKENS in collector/news-sources/_entities.mjs,
// where the same vocabulary is used for the opposite purpose — there it decides
// whether an item is AI-related at all. A word can be the reason an item is in
// the corpus and still be useless for telling two items in that corpus apart.
const GENERIC = new Set([
  'ai', 'ais', 'agi', 'asi', 'artificial', 'intelligence', 'intelligent',
  'llm', 'llms', 'model', 'models', 'machine', 'learning', 'deep', 'neural',
  'network', 'networks', 'generative', 'genai', 'chatbot', 'chatbots',
  'agent', 'agents', 'agentic', 'bot', 'bots', 'assistant', 'assistants',
  'transformer', 'transformers', 'diffusion', 'inference', 'training', 'train',
  'token', 'tokens', 'benchmark', 'benchmarks', 'dataset', 'datasets', 'data',
  'gpu', 'gpus', 'tpu', 'tpus', 'compute', 'cloud', 'chip', 'chips',
  'tech', 'technology', 'technologies', 'software', 'hardware', 'platform',
  'system', 'systems', 'tool', 'tools', 'app', 'apps', 'product', 'products',
  'company', 'companies', 'startup', 'startups', 'firm', 'firms', 'lab', 'labs',
  'research', 'researcher', 'researchers', 'study', 'studies', 'paper', 'papers',
  'report', 'reports', 'news', 'update', 'updates', 'launch', 'launches',
  'release', 'releases', 'announce', 'announcement', 'announcements',
  'use', 'using', 'used', 'user', 'users', 'people', 'work', 'working',
  'show', 'shows', 'ask', 'asks', 'tell', 'tells', 'year', 'years', 'day', 'days',
  'week', 'weeks', 'month', 'months', 'time', 'times', 'way', 'ways', 'thing', 'things',

  // Sourcing tags. Techmeme prefixes headlines with its provenance —
  // "Sources:", "Exclusive:", "Email:", "Court docs:" — which says where the
  // reporting came from, not what happened. On the live corpus of 2026-09-24 a
  // White House memo story and a UN Security Council story were linked on
  // {anthropic, informat, sourc}: the word "Sources:" and the masthead of
  // The Information.
  'source', 'sources', 'exclusive', 'email', 'emails', 'doc', 'docs', 'memo',
  'interview', 'scoop', 'filing', 'filings',

  // Funding-round boilerplate. Every venture story in the corpus is built from
  // the same eight words, so three of them in common is the base rate rather
  // than evidence. Measured: a Dallas browser-security round and a Colorado
  // drug-discovery round were linked on {bas, raiz, valuat} — "based",
  // "raised", "valuation".
  'raise', 'raised', 'raises', 'raising', 'based', 'valuation', 'valuations',
  'funding', 'funded', 'investor', 'investors', 'investment', 'million',
  'billion', 'trillion', 'backed', 'venture', 'capital', 'equity', 'round',
  'led', 'worth', 'deal', 'deals',

  // Product-announcement verbs, for the same reason.
  'unveil', 'unveils', 'preview', 'previews', 'add', 'adds', 'bring', 'brings',
  'let', 'lets', 'allow', 'allows', 'test', 'tests', 'testing', 'roll', 'rolls',
  'plan', 'plans', 'planning',
].map(stem));

// Company and product names, mirrored from ENTITY_DEFS in
// collector/news-sources/_entities.mjs. They are NOT dropped — "OpenAI" in two
// headlines is weak evidence and weak evidence still counts — but a link that
// rests ONLY on names is rejected by the non-entity guard, because a week's
// corpus contains dozens of unrelated OpenAI headlines.
//
// Mirrored rather than imported: _entities.mjs does not export the table, and
// it is not this task's file to change. Drift between the two lists costs
// nothing worse than a name being treated as an ordinary word.
const ENTITY_WORDS = new Set([
  'openai', 'anthropic', 'deepmind', 'google', 'meta', 'mistral', 'xai', 'deepseek',
  'qwen', 'alibaba', 'tongyi', 'moonshot', 'zhipu', 'nvidia', 'microsoft', 'msft',
  'amazon', 'aws', 'bedrock', 'apple', 'cohere', 'hugging', 'huggingface', 'face',
  'stability', 'black', 'forest', 'safe', 'superintelligence', 'ssi', 'thinking',
  'machines', 'perplexity', 'baidu', 'tencent', 'bytedance', 'allen', 'institute',
  'gpt', 'chatgpt', 'claude', 'gemini', 'gemma', 'llama', 'grok', 'mixtral',
  'magistral', 'devstral', 'codestral', 'phi', 'command', 'kimi', 'glm', 'nemotron',
  'sora', 'veo', 'whisper', 'stable', 'sdxl', 'flux', 'opus', 'sonnet', 'haiku',
  'fair', 'seed', 'copilot', 'gpt4', 'gpt5', 'gpt6',

  // Publication names get the same treatment as company names, and for exactly
  // the same reason: two headlines both credited to Bloomberg is a fact about
  // Bloomberg. The trailing-credit strip in clusterTitle() removes most of
  // these before they are ever tokenised; this list catches the ones that
  // appear in the body of a headline instead of in the byline.
  'bloomberg', 'reuters', 'engadget', 'geekwire', 'techcrunch', 'verge',
  'wired', 'information', 'journal', 'wsj', 'cnbc', 'axios', 'semafor',
  'politico', 'guardian', 'forbes', 'register', 'gizmodo', 'techmeme',
  'technica', 'nyt', 'times', 'post', 'insider', 'venturebeat', 'economist',
  'atlantic', 'telegraph', 'independent', 'punchbowl', 'cnn', 'bbc', 'nikkei',
  'scmp', 'caixin', 'age', 'transformer', 'newsletter',
].map(stem));

// Every severity surface form, stemmed. Dropped from the distinctive set so the
// word "breach" ALONE can never merge two unrelated breaches — which is exactly
// the failure mode a severity table invites if you forget to do this.
// Dropped from the DISTINCTIVE set, and here the stem is the right tool: the
// point is to remove the whole family of a word from the clustering vocabulary
// so "breach" alone cannot merge two unrelated breaches, and over-removing a
// couple of neighbouring forms costs nothing. `hacker` and bare `hack` are
// added explicitly even though they no longer score, for the same reason.
const INCIDENT_STEMS = new Set(
  [...SEVERITY_TERMS.a, ...SEVERITY_TERMS.b, ...SEVERITY_TERMS.c,
    ...SEVERITY_PHRASES.a, ...SEVERITY_PHRASES.b, ...SEVERITY_PHRASES.c,
    'hack', 'hacker', 'hackers', 'compromise', 'escape', 'security', 'cyber']
    .flatMap((t) => t.split(' '))
    .map(stem),
);

const STRONG_WORDS = new Set(STRONG_SIGNALS.flatMap((t) => t.split(' ')));

// Severity lookups, keyed on the SURFACE form. See the note on SEVERITY_TERMS.
const SEVERITY_BY_WORD = new Map();
for (const tier of ['a', 'b', 'c']) {
  for (const term of SEVERITY_TERMS[tier]) {
    // First tier wins, so a form listed in two tiers takes the heavier one:
    // a/b/c is iterated in descending weight order.
    if (!SEVERITY_BY_WORD.has(term)) SEVERITY_BY_WORD.set(term, { tier, term });
  }
}
const SEVERITY_PHRASE_BY_WORDS = new Map();
for (const tier of ['a', 'b', 'c']) {
  for (const phrase of SEVERITY_PHRASES[tier]) {
    if (!SEVERITY_PHRASE_BY_WORDS.has(phrase)) SEVERITY_PHRASE_BY_WORDS.set(phrase, { tier, term: phrase });
  }
}

/** Lowercased, accent-folded, punctuation-free word sequence. No stemming. */
export function wordSequence(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** Raw stem sequence of a piece of text, in order, before any vocabulary filter. */
export function stemSequence(text) {
  return wordSequence(text).map(stem);
}

/**
 * The distinctive words of a title: what is left after structure, generic AI
 * vocabulary and the incident vocabulary are removed.
 *
 * Returns the surviving stems AND what was dropped and why, because a cluster
 * the reader cannot argue with is a cluster the reader has to trust, and this
 * project does not ask for trust.
 */
export function distinctiveWords(title) {
  const words = new Set();
  const dropped = { stop: [], generic: [], incident: [], numeric: [], short: [] };

  for (const raw of stemSequence(clusterTitle(title))) {
    if (raw.length < 3) { dropped.short.push(raw); continue; }
    if (/^\d+$/.test(raw)) { dropped.numeric.push(raw); continue; }
    if (STOPWORDS.has(raw)) { dropped.stop.push(raw); continue; }
    if (GENERIC.has(raw)) { dropped.generic.push(raw); continue; }
    if (INCIDENT_STEMS.has(raw)) { dropped.incident.push(raw); continue; }
    words.add(raw);
  }
  return { words, dropped };
}

/** Is this stem a company or product name rather than an ordinary word? */
export function isEntityWord(word) {
  return ENTITY_WORDS.has(word);
}

// ---------------------------------------------------------------------------
// Incident severity
// ---------------------------------------------------------------------------

function scanSeverity(text, field, factor) {
  const words = wordSequence(text);
  const hits = [];
  let max = 0;

  for (let i = 0; i < words.length; i++) {
    const single = SEVERITY_BY_WORD.get(words[i]);
    if (single) {
      const weight = SEVERITY_WEIGHTS[single.tier] * factor;
      hits.push({ term: single.term, matched: words[i], tier: single.tier, field, weight: round2(weight) });
      if (weight > max) max = weight;
    }
    for (let n = 2; n <= 3 && i + n <= words.length; n++) {
      const key = words.slice(i, i + n).join(' ');
      const phrase = SEVERITY_PHRASE_BY_WORDS.get(key);
      if (!phrase) continue;
      const weight = SEVERITY_WEIGHTS[phrase.tier] * factor;
      hits.push({ term: phrase.term, matched: key, tier: phrase.tier, field, weight: round2(weight) });
      if (weight > max) max = weight;
    }
  }
  return { max, hits };
}

/**
 * How severe is the event this item describes, in [0, 1]?
 *
 * MAX, never sum. "A rogue agent breached containment" is one event described
 * three ways, not three events; summing would let a florid headline outscore a
 * worse incident reported plainly.
 *
 * PAPERS SCORE ZERO AND ARE NOT SCANNED. arXiv abstracts discuss attacks,
 * exploits, jailbreaks and leakage as SUBJECT MATTER, constantly — "Jailbreak
 * Robustness of Vision-Language Models" is a research result, not an incident.
 * This is the same rule and the same reasoning news.mjs already applies when it
 * refuses to let keywords move a paper out of the capability pillar.
 */
export function incidentSeverity(item) {
  const kind = item && item.kind;
  if (kind === 'paper') {
    return { severity: 0, band: null, terms: [], excluded: 'paper' };
  }

  const fromTitle = scanSeverity(item.title ?? '', 'title', 1);
  const fromSummary = scanSeverity(item.summary ?? '', 'summary', SEVERITY_SUMMARY_FACTOR);

  const severity = round2(Math.max(fromTitle.max, fromSummary.max));
  const terms = [...fromTitle.hits, ...fromSummary.hits]
    .sort((a, b) => b.weight - a.weight || a.field.localeCompare(b.field) || a.term.localeCompare(b.term));

  // Deduplicate by (term, field): a headline that says "breach" twice fired one
  // rule, and printing it twice makes the audit line lie about the evidence.
  const seen = new Set();
  const unique = terms.filter((t) => {
    const k = `${t.field}|${t.term}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // `band` is the band the FINAL severity lands in, which is the strongest
  // term's own tier only when that term was in the headline. A tier-A word
  // found in a summary scores 0.35 and reports band C, and that is the honest
  // reading: the evidence is a passing mention, not a headline claim. Each term
  // carries its own `tier` so the difference is visible.
  let band = null;
  if (severity >= SEVERITY_WEIGHTS.a) band = 'A';
  else if (severity >= SEVERITY_WEIGHTS.b) band = 'B';
  else if (severity > 0) band = 'C';

  return { severity, band, terms: unique, excluded: null };
}

/** Does this item carry an escalation signal (rogue / escaped / self-replication)? */
export function hasStrongSignal(item) {
  if (!item || item.kind === 'paper') return false;
  return wordSequence(item.title ?? '').some((w) => STRONG_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Linking
// ---------------------------------------------------------------------------

/**
 * Should these two items be linked, and on what evidence?
 *
 * Returns null, or { rule, words, non_entity_words }. `words` is the whole
 * point: every merge in the published file names the words that caused it.
 */
export function linkRule(a, b) {
  const shared = [];
  for (const w of a.words) if (b.words.has(w)) shared.push(w);
  if (shared.length === 0) return null;
  shared.sort();

  const nonEntity = shared.filter((w) => !isEntityWord(w));
  // A link resting only on names is not evidence of a shared event.
  if (nonEntity.length < CLUSTER.MIN_NON_ENTITY_WORDS) return null;

  if (shared.length >= CLUSTER.SHARED_WORDS && nonEntity.length >= CLUSTER.SHARED_NON_ENTITY_WORDS) {
    return { rule: 'shared-words', words: shared, non_entity_words: nonEntity };
  }

  const bothIncidents = a.severity >= CLUSTER.INCIDENT_MIN_SEVERITY
    && b.severity >= CLUSTER.INCIDENT_MIN_SEVERITY;
  if (bothIncidents && shared.length >= CLUSTER.INCIDENT_SHARED_WORDS) {
    return { rule: 'incident-pair', words: shared, non_entity_words: nonEntity };
  }

  // The escalation path, and the only single-word link in the file. One side is
  // claiming something got out; the other is a full-strength incident. Both
  // severity tests and the non-entity guard still apply, so the single word has
  // to be an ordinary word shared by two items that are both already incidents.
  const escalation =
    (a.strong && b.severity >= CLUSTER.FULL_STRENGTH_SEVERITY) ||
    (b.strong && a.severity >= CLUSTER.FULL_STRENGTH_SEVERITY);
  if (escalation && shared.length >= CLUSTER.SIGNAL_SHARED_WORDS) {
    return { rule: 'escalation-signal', words: shared, non_entity_words: nonEntity };
  }

  return null;
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

function storyId(memberIds) {
  return createHash('sha256').update(memberIds.slice().sort().join('|')).digest('hex').slice(0, 12);
}

/** Distinct sources carrying an item: its own corroboration group, already computed upstream. */
function itemSources(item) {
  const c = item && item.meta && item.meta.corroboration;
  const list = Array.isArray(c && c.sources) && c.sources.length ? c.sources : [item.source];
  return list.filter((s) => typeof s === 'string' && s);
}

/**
 * Cluster the window into stories and publish the severity and coverage terms.
 *
 * @param {object[]} items  the post-membership-cut window, newest first
 * @param {object} opts     { generatedAtMs }
 * @returns {{ items: object[], stories: object[], rules: object }}
 */
export function storyPass(items, { generatedAtMs } = {}) {
  const list = Array.isArray(items) ? items : [];

  // --- prepare -------------------------------------------------------------
  // Index order is the input order, which news.mjs has already made total
  // (published_at desc, score desc, id asc). Every loop below walks it in that
  // order, so every decision — including which near-miss is published and which
  // union is rejected — is a pure function of the inputs.
  const prepared = list.map((item, index) => {
    const sev = incidentSeverity(item);
    // `dropped` is returned by distinctiveWords() and deliberately not carried
    // onto the item: it is per-item debugging detail that would add a few
    // hundred bytes to every row of a file phones download (docs/NEWS.md,
    // MAX_ITEMS). It is reachable by calling distinctiveWords(title) on any
    // published headline, which is the audit path that matters.
    const { words } = item.kind === 'paper'
      ? { words: new Set() }
      : distinctiveWords(item.title);
    return {
      index,
      item,
      id: item.id,
      kind: item.kind,
      publishedMs: Date.parse(item.published_at),
      words,
      severity: sev.severity,
      band: sev.band,
      terms: sev.terms,
      strong: hasStrongSignal(item),
      // PAPERS ARE EXCLUDED FROM CLUSTERING, and this is the load-bearing
      // exclusion in the file. arXiv titles share vocabulary relentlessly —
      // "memory", "reasoning", "video", "agent", "benchmark" — and three shared
      // words is a normal Tuesday between two unrelated preprints. Left in,
      // they merge into giant false stories that would then be credited with
      // the coverage bonus, which is the worst possible place for a false
      // merge to land.
      clusterable: item.kind !== 'paper' && Number.isFinite(Date.parse(item.published_at)),
    };
  });

  // --- union-find ----------------------------------------------------------
  const parent = prepared.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  // Cluster extent, tracked per root so a CHAIN of links cannot quietly span
  // more than the window. Without this, A-B at 90h and B-C at 90h produce one
  // story spanning 180 hours, and the 96h guard would be decorative.
  const extent = prepared.map((p) => ({ min: p.publishedMs, max: p.publishedMs }));

  const links = [];
  const nearMisses = [];
  const rejected = { span: 0, entity_only: 0, near_miss: 0 };
  const spanMs = CLUSTER.WINDOW_HOURS * 3_600_000;

  for (let i = 0; i < prepared.length; i++) {
    const a = prepared[i];
    if (!a.clusterable) continue;
    for (let j = i + 1; j < prepared.length; j++) {
      const b = prepared[j];
      if (!b.clusterable) continue;
      if (find(i) === find(j)) continue;
      if (Math.abs(a.publishedMs - b.publishedMs) > spanMs) continue;

      const link = linkRule(a, b);
      if (!link) {
        // Near misses are recorded, not discarded. "Two words in common, not
        // both incidents" is the exact boundary a maintainer needs to see to
        // judge whether the thresholds are right, and it is the honest place
        // to look for a story this pass MISSED.
        const shared = [];
        for (const w of a.words) if (b.words.has(w)) shared.push(w);
        if (shared.length >= CLUSTER.INCIDENT_SHARED_WORDS) {
          shared.sort();
          const nonEntity = shared.filter((w) => !isEntityWord(w));
          let reason;
          if (nonEntity.length < CLUSTER.MIN_NON_ENTITY_WORDS) {
            rejected.entity_only += 1;
            reason = 'every shared word is a company, product or publication name';
          } else if (shared.length >= CLUSTER.SHARED_WORDS) {
            rejected.entity_only += 1;
            reason = `${shared.length} shared words but only ${nonEntity.length} that is not a name`;
          } else {
            rejected.near_miss += 1;
            reason = `${shared.length} shared words, and not both items are incidents`;
          }
          nearMisses.push({
            a: a.id, b: b.id, a_title: a.item.title, b_title: b.item.title,
            shared_words: shared,
            non_entity_words: nonEntity,
            reason,
            severity_a: a.severity, severity_b: b.severity,
          });
        }
        continue;
      }

      const ra = find(i);
      const rb = find(j);
      const merged = {
        min: Math.min(extent[ra].min, extent[rb].min),
        max: Math.max(extent[ra].max, extent[rb].max),
      };
      if (merged.max - merged.min > spanMs) {
        rejected.span += 1;
        nearMisses.push({
          a: a.id, b: b.id, a_title: a.item.title, b_title: b.item.title,
          shared_words: link.words,
          reason: `merging would give the cluster a span over ${CLUSTER.WINDOW_HOURS}h`,
          severity_a: a.severity, severity_b: b.severity,
        });
        continue;
      }

      const root = Math.min(ra, rb);
      parent[Math.max(ra, rb)] = root;
      extent[root] = merged;
      links.push({
        a: a.id,
        b: b.id,
        rule: link.rule,
        words: link.words,
        non_entity_words: link.non_entity_words,
        severity_a: a.severity,
        severity_b: b.severity,
      });
    }
  }

  // --- build stories -------------------------------------------------------
  const byRoot = new Map();
  prepared.forEach((p, i) => {
    if (!p.clusterable) return;
    const root = find(i);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(p);
  });

  const linksByPair = new Map(links.map((l) => [`${l.a}|${l.b}`, l]));
  const storyOf = new Map();   // item id -> story
  const stories = [];

  for (const [, members] of [...byRoot.entries()].sort((x, y) => x[0] - y[0])) {
    if (members.length < 2) continue;   // a singleton is its own story, implicitly

    const memberIds = members.map((m) => m.id).sort();
    const sources = [...new Set(members.flatMap((m) => itemSources(m.item)))].sort();
    const severity = members.reduce((max, m) => Math.max(max, m.severity), 0);
    const ordered = members.slice().sort((a, b) => a.publishedMs - b.publishedMs || a.id.localeCompare(b.id));

    const terms = [];
    const seenTerm = new Set();
    for (const m of members.slice().sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))) {
      for (const t of m.terms) {
        if (seenTerm.has(t.term)) continue;
        seenTerm.add(t.term);
        terms.push({ term: t.term, tier: t.tier, field: t.field, weight: t.weight, item: m.id });
      }
    }

    const story = {
      id: storyId(memberIds),
      members: memberIds,
      sources,
      source_count: sources.length,
      severity: round2(severity),
      severity_terms: terms,
      first_published_at: ordered[0].item.published_at,
      last_published_at: ordered[ordered.length - 1].item.published_at,
      span_hours: round1((ordered[ordered.length - 1].publishedMs - ordered[0].publishedMs) / 3_600_000),
      links: memberIds
        .flatMap((x, ix) => memberIds.slice(ix + 1).map((y) => linksByPair.get(`${x}|${y}`) || linksByPair.get(`${y}|${x}`)))
        .filter(Boolean),
      lead: null,   // filled below, once severity is scored
    };
    stories.push(story);
    for (const m of members) storyOf.set(m.id, story);
  }

  // --- score ---------------------------------------------------------------
  // Severity first for every item, because the lead is chosen on the score that
  // includes it. Then coverage, to the lead alone.
  const preparedById = new Map(prepared.map((p) => [p.id, p]));
  const withSeverity = new Map();

  for (const p of prepared) {
    const base = p.item.meta && p.item.meta.score_components ? p.item.meta.score_components : {};
    const severityPoints = round1(STORY_SCORE.SEVERITY_MAX * p.severity);
    withSeverity.set(p.id, {
      source_weight: Number(base.source_weight) || 0,
      recency: Number(base.recency) || 0,
      corroboration: Number(base.corroboration) || 0,
      entities: Number(base.entities) || 0,
      engagement: Number(base.engagement) || 0,
      severity: severityPoints,
      coverage: 0,
    });
  }

  const sumOf = (c) => round1(c.source_weight + c.recency + c.corroboration + c.entities + c.engagement + c.severity + c.coverage);

  for (const story of stories) {
    // Lead selection, deterministic and stated: the highest-scoring member once
    // severity is counted, then the earliest sighting, then the id. It is the
    // item the strip headlines with and the only member credited with coverage.
    const lead = story.members
      .map((id) => preparedById.get(id))
      .sort((a, b) => {
        const d = sumOf(withSeverity.get(b.id)) - sumOf(withSeverity.get(a.id));
        if (d !== 0) return d;
        if (a.publishedMs !== b.publishedMs) return a.publishedMs - b.publishedMs;
        return a.id.localeCompare(b.id);
      })[0];
    story.lead = lead.id;

    // COVERAGE GOES TO THE LEAD ONLY. Credit every member and a four-outlet
    // story puts four items in the top ten — the reel becomes one event told
    // four times, which is the duplication docs/VISITORS.md §5.1 already says
    // to delete, reintroduced through the scoring formula. One story, one
    // ranked item, its siblings listed underneath it.
    const own = itemSources(lead.item).length;
    const extra = Math.max(0, story.source_count - own);
    withSeverity.get(lead.id).coverage = Math.min(
      STORY_SCORE.COVERAGE_MAX,
      STORY_SCORE.COVERAGE_PER_SOURCE * extra,
    );
  }

  // --- emit ----------------------------------------------------------------
  const outItems = prepared.map((p) => {
    const components = withSeverity.get(p.id);
    const raw = sumOf(components);

    // THE CLAMP MUST NOT BREAK THE SUM. `score == sum(components)` is asserted
    // downstream and printed on every card by site/templates/_reel.mjs, so a
    // clamp that silently lops points off the total turns the published
    // arithmetic into a lie. Instead the overflow is taken OUT OF THE
    // COMPONENTS, newest term first (coverage, then severity), and what was
    // removed is published. The five original terms are never touched by the
    // clamp: they already sum to at most 100 on their own.
    let clamp = null;
    if (raw > 100) {
      let over = round1(raw - 100);
      const take = (key) => {
        const cut = Math.min(components[key], over);
        if (cut <= 0) return null;
        components[key] = round1(components[key] - cut);
        over = round1(over - cut);
        return { component: key, removed: round1(cut) };
      };
      const removed = [take('coverage'), take('severity')].filter(Boolean);
      clamp = { raw_total: raw, ceiling: 100, removed };
    }

    const score = sumOf(components);
    const story = storyOf.get(p.id);

    const meta = {
      ...p.item.meta,
      score_components: components,
      incident: {
        severity: p.severity,
        band: p.band,
        strong_signal: p.strong,
        terms: p.terms,
        excluded: p.kind === 'paper' ? 'paper' : null,
      },
      story: story
        ? {
          id: story.id,
          lead: story.lead,
          is_lead: story.lead === p.id,
          members: story.members,
          source_count: story.source_count,
          sources: story.sources,
          severity: story.severity,
          // The audit line for THIS item: which words tied it to which sibling.
          linked_by: story.links
            .filter((l) => l.a === p.id || l.b === p.id)
            .map((l) => ({ with: l.a === p.id ? l.b : l.a, rule: l.rule, words: l.words })),
        }
        : null,
    };
    if (clamp) meta.score_clamp = clamp;

    return { ...p.item, score, meta };
  });

  const rules = {
    version: STORY_RULES_VERSION,
    window_hours: CLUSTER.WINDOW_HOURS,
    shared_words: CLUSTER.SHARED_WORDS,
    shared_non_entity_words: CLUSTER.SHARED_NON_ENTITY_WORDS,
    incident_shared_words: CLUSTER.INCIDENT_SHARED_WORDS,
    incident_min_severity: CLUSTER.INCIDENT_MIN_SEVERITY,
    escalation_shared_words: CLUSTER.SIGNAL_SHARED_WORDS,
    min_non_entity_words: CLUSTER.MIN_NON_ENTITY_WORDS,
    papers_excluded: true,
    severity_weights: SEVERITY_WEIGHTS,
    severity_summary_factor: SEVERITY_SUMMARY_FACTOR,
    severity_terms: SEVERITY_TERMS,
    severity_phrases: SEVERITY_PHRASES,
    strong_signals: STRONG_SIGNALS,
    points: STORY_SCORE,
    counts: {
      clusterable_items: prepared.filter((p) => p.clusterable).length,
      papers_excluded: prepared.filter((p) => p.kind === 'paper').length,
      stories: stories.length,
      clustered_items: stories.reduce((n, s) => n + s.members.length, 0),
      links: links.length,
      rejected,
    },
    // Published, capped, deterministic. The stories this pass decided NOT to
    // merge are the only evidence a reader has that the thresholds are doing
    // work, and a clustering layer that publishes only its merges is asking to
    // be believed.
    near_misses: nearMisses
      .slice()
      .sort((x, y) => y.shared_words.length - x.shared_words.length || x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
      .slice(0, NEAR_MISS_PUBLISHED),
  };

  return { items: outItems, stories, rules };
}
