#!/usr/bin/env node
// MARKET MOOD — headline tone for the companies the newsroom already names.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/mood.mjs
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/mood.mjs --selftest
//
// WHY. Ainnect's daily dashboard leads with a -100…100 "market mood" index
// built by matching fixed word lists against headlines that name a company.
// That is the same honesty bar this repo already holds for /balance: published
// lexicons, no model judgement, every hit auditable. This module closes the
// competitive gap without inventing a new kind of claim — it is headline tone,
// not company performance, and the page says so.
//
// NETWORK: none. Reads data/news.json only. CONTRACT.md §1.5 is satisfied by
// not calling fetch at all.
//
// DETERMINISM: generated_at is the newsroom's stamp (or the as_of of the newest
// scored item). Two runs over the same news.json write byte-identical output.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordSequence } from './news-stories.mjs';

export const MOOD_SCHEMA = 1;
export const MOOD_VERSION = '1.0.0';
export const LEXICON_VERSION = 'v1';

// ---------------------------------------------------------------------------
// Companies. Published roster, longest surface forms first per company so
// "Google DeepMind" wins over "Google" at the same position.
// ---------------------------------------------------------------------------

export const COMPANIES = Object.freeze([
  { id: 'apple', name: 'Apple', forms: ['Apple Intelligence', 'Apple'] },
  { id: 'openai', name: 'OpenAI', forms: ['OpenAI'] },
  { id: 'nvidia', name: 'NVIDIA', forms: ['NVIDIA', 'Nvidia'] },
  { id: 'anthropic', name: 'Anthropic', forms: ['Anthropic'] },
  { id: 'meta', name: 'Meta', forms: ['Meta AI', 'Meta Superintelligence', 'Meta', 'Facebook', 'FAIR'] },
  { id: 'xai', name: 'xAI', forms: ['xAI'] },
  { id: 'google', name: 'Google', forms: ['Google DeepMind', 'DeepMind', 'Alphabet', 'Google'] },
  { id: 'microsoft', name: 'Microsoft', forms: ['Microsoft AI', 'Microsoft', 'MSFT'] },
  { id: 'amazon', name: 'Amazon', forms: ['Amazon Bedrock', 'Amazon', 'AWS'] },
  { id: 'deepseek', name: 'DeepSeek', forms: ['DeepSeek'] },
]);

// Positive / negative / clickbait lists. Surface forms, not stems — same reason
// balance.mjs gives: stemming "hackers" fired on "Hacker News". ANY EDIT IS A
// NEW INSTRUMENT; bump LEXICON_VERSION with the lists.
export const POSITIVE_TERMS = Object.freeze([
  'raises', 'raise', 'raised', 'raising', 'unveil', 'unveils', 'unveiled', 'unveiling',
  'launch', 'launches', 'launched', 'launching', 'debut', 'debuts', 'debuted',
  'breakthrough', 'record', 'surge', 'surges', 'surged', 'soar', 'soars', 'soared',
  'wins', 'won', 'winning', 'beats', 'beat', 'beating', 'leads', 'leading', 'leader',
  'partners', 'partnered', 'partnership', 'expands', 'expanded', 'expansion',
  'approves', 'approved', 'approval', 'deal', 'deals', 'hire', 'hires', 'hired', 'hiring',
  'open sources', 'open-sources', 'open sourced', 'open-sourced',
]);

export const NEGATIVE_TERMS = Object.freeze([
  'ban', 'bans', 'banned', 'banning', 'risks', 'risk', 'risky',
  'lawsuit', 'lawsuits', 'sued', 'sues', 'suing', 'probe', 'probes', 'probed',
  'hack', 'hacked', 'hacking', 'breach', 'breached', 'breaches',
  'leak', 'leaks', 'leaked', 'fine', 'fines', 'fined', 'layoffs', 'laid off',
  'cuts', 'cut', 'cutting', 'delay', 'delays', 'delayed', 'fail', 'fails', 'failed', 'failure',
  'outage', 'outages', 'down', 'crash', 'crashes', 'crashed',
  'scam', 'scams', 'fraud', 'fraudulent', 'misuse', 'misused',
  'compromised', 'exploit', 'exploits', 'exploited', 'abuse', 'abused',
  'warns', 'warned', 'warning', 'warnings', 'backlash', 'controversy',
  'investigation', 'investigates', 'investigated', 'recall', 'recalls', 'recalled',
]);

export const CLICKBAIT_TERMS = Object.freeze([
  'you will not believe', "you won't believe", 'this changes everything',
  'shocked', 'shocking', 'destroyed', 'destroys', 'obliterates',
]);

export const RULE = Object.freeze({
  POSITIVE_WEIGHT: 3,
  NEGATIVE_WEIGHT: -4,
  CLICKBAIT_WEIGHT: -12,
  HEADLINE_CAP: 15,
  INDEX_SCALE: 8,
});

function compileTerms(terms) {
  // Map first-word -> list of { words, term } for multi-word matching.
  const byFirst = new Map();
  for (const term of terms) {
    const words = wordSequence(term);
    if (!words.length) continue;
    const bucket = byFirst.get(words[0]) || [];
    bucket.push({ words, term });
    byFirst.set(words[0], bucket);
  }
  for (const bucket of byFirst.values()) bucket.sort((a, b) => b.words.length - a.words.length);
  return byFirst;
}

const COMPILED = {
  positive: compileTerms(POSITIVE_TERMS),
  negative: compileTerms(NEGATIVE_TERMS),
  clickbait: compileTerms(CLICKBAIT_TERMS),
};

function scan(words, compiled) {
  const hits = [];
  for (let i = 0; i < words.length; i++) {
    for (const t of compiled.get(words[i]) ?? []) {
      if (i + t.words.length > words.length) continue;
      let ok = true;
      for (let k = 1; k < t.words.length; k++) {
        if (words[i + k] !== t.words[k]) { ok = false; break; }
      }
      if (ok) hits.push(t.term);
    }
  }
  return [...new Set(hits)].sort();
}

function surfaceRegex(forms) {
  const alternatives = forms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![A-Za-z0-9])(?:${alternatives.join('|')})(?![A-Za-z0-9])`, 'i');
}

const COMPANY_RES = COMPANIES.map((c) => ({ ...c, re: surfaceRegex(c.forms) }));

/** Companies named in a headline (canonical ids), sorted. */
export function companiesIn(title) {
  const hits = [];
  for (const c of COMPANY_RES) {
    if (c.re.test(String(title ?? ''))) hits.push(c.id);
  }
  return hits;
}

/**
 * Score one headline under the published rule.
 * Returns { raw, capped, positive, negative, clickbait }.
 */
export function scoreHeadline(title) {
  const words = wordSequence(title);
  const positive = scan(words, COMPILED.positive);
  const negative = scan(words, COMPILED.negative);
  const clickbait = scan(words, COMPILED.clickbait);
  const raw = positive.length * RULE.POSITIVE_WEIGHT
    + negative.length * RULE.NEGATIVE_WEIGHT
    + clickbait.length * RULE.CLICKBAIT_WEIGHT;
  const capped = Math.max(-RULE.HEADLINE_CAP, Math.min(RULE.HEADLINE_CAP, raw));
  return { raw, capped, positive, negative, clickbait };
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Pure builder. news is data/news.json (or a fixture).
 * Returns the mood payload; never throws on empty input.
 */
export function buildMood(news, { asOf = null } = {}) {
  const items = Array.isArray(news?.items) ? news.items : [];
  const generatedAt = asOf
    || (typeof news?.generated_at === 'string' ? news.generated_at : null)
    || items.map((it) => it.published_at).filter(Boolean).sort().at(-1)
    || '1970-01-01T00:00:00.000Z';

  const byCompany = new Map(COMPANIES.map((c) => [c.id, {
    id: c.id,
    name: c.name,
    headlines: [],
    scores: [],
  }]));

  let scanned = 0;
  for (const item of items) {
    const title = item?.title;
    if (!title) continue;
    const named = companiesIn(title);
    if (!named.length) continue;
    scanned += 1;
    const score = scoreHeadline(title);
    for (const id of named) {
      const row = byCompany.get(id);
      row.headlines.push({
        id: item.id ?? null,
        title,
        url: item.url ?? null,
        source: item.source ?? null,
        published_at: item.published_at ?? null,
        score: score.capped,
        positive: score.positive,
        negative: score.negative,
        clickbait: score.clickbait,
      });
      row.scores.push(score.capped);
    }
  }

  const companies = COMPANIES.map((c) => {
    const row = byCompany.get(c.id);
    row.headlines.sort((a, b) => String(b.published_at ?? '').localeCompare(String(a.published_at ?? ''))
      || String(a.id ?? '').localeCompare(String(b.id ?? '')));
    const n = row.scores.length;
    const mean = n ? row.scores.reduce((a, b) => a + b, 0) / n : null;
    const index = mean === null ? null : round1(mean * RULE.INDEX_SCALE);
    return {
      id: c.id,
      name: c.name,
      headlines: n,
      index, // null = mentioned zero times this window (missing, not neutral)
      mean_headline: mean === null ? null : round1(mean),
      sample: row.headlines.slice(0, 8),
    };
  });

  // Rank only those with at least one headline. Missing stays off the board.
  const ranked = companies
    .filter((c) => c.index !== null)
    .slice()
    .sort((a, b) => b.index - a.index || a.name.localeCompare(b.name));

  const leading = ranked[0] || null;
  const trailing = ranked.length ? ranked[ranked.length - 1] : null;
  const mostDiscussed = companies
    .filter((c) => c.headlines > 0)
    .slice()
    .sort((a, b) => b.headlines - a.headlines || a.name.localeCompare(b.name))[0] || null;

  // Headlines can land on multiple companies; share is over company-headline pairs.
  const negativeShare = (() => {
    let withNeg = 0;
    let total = 0;
    for (const row of byCompany.values()) {
      for (const h of row.headlines) {
        total += 1;
        if (h.negative.length) withNeg += 1;
      }
    }
    // Three decimals: a ~4% share rounds to 0.0 at one decimal and looks like
    // "no negative wording" on the page.
    return total ? round3(withNeg / total) : null;
  })();

  return {
    schema: MOOD_SCHEMA,
    version: MOOD_VERSION,
    lexicon_version: LEXICON_VERSION,
    generated_at: generatedAt,
    news_generated_at: news?.generated_at ?? null,
    window_days: news?.window_days ?? null,
    rule: {
      statement:
        'Every headline naming a roster company is scanned for words on three fixed lists. '
        + `Each of ${POSITIVE_TERMS.length} positive terms adds ${RULE.POSITIVE_WEIGHT}; `
        + `each of ${NEGATIVE_TERMS.length} negative terms subtracts ${Math.abs(RULE.NEGATIVE_WEIGHT)}; `
        + `clickbait phrasing subtracts ${Math.abs(RULE.CLICKBAIT_WEIGHT)}. `
        + `One headline is capped at ±${RULE.HEADLINE_CAP}. Those are averaged across the `
        + `company's headlines and multiplied by ${RULE.INDEX_SCALE}, giving the -100 to 100 index.`,
      matches_words_not_meaning: true,
      zero_means: 'The company was mentioned but no scoring term matched — neutral, not missing.',
      null_means: 'The company was not named in any headline in this window.',
      positive_weight: RULE.POSITIVE_WEIGHT,
      negative_weight: RULE.NEGATIVE_WEIGHT,
      clickbait_weight: RULE.CLICKBAIT_WEIGHT,
      headline_cap: RULE.HEADLINE_CAP,
      index_scale: RULE.INDEX_SCALE,
    },
    totals: {
      items_in_window: items.length,
      headlines_naming_a_company: scanned,
      companies_on_roster: COMPANIES.length,
      companies_with_headlines: ranked.length,
      negative_pair_share: negativeShare,
    },
    glance: {
      leading: leading ? { id: leading.id, name: leading.name, index: leading.index } : null,
      trailing: trailing ? { id: trailing.id, name: trailing.name, index: trailing.index } : null,
      most_discussed: mostDiscussed
        ? { id: mostDiscussed.id, name: mostDiscussed.name, headlines: mostDiscussed.headlines }
        : null,
    },
    companies,
    ranked,
    lexicons: {
      positive: [...POSITIVE_TERMS],
      negative: [...NEGATIVE_TERMS],
      clickbait: [...CLICKBAIT_TERMS],
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    runSelftest();
    return;
  }
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : 'data/mood.json';
  const newsPath = 'data/news.json';
  if (!existsSync(newsPath)) {
    console.error('mood: data/news.json missing — run collector/news.mjs first');
    process.exit(1);
  }
  const news = JSON.parse(await readFile(newsPath, 'utf8'));
  const mood = buildMood(news);
  await writeFile(outPath, `${JSON.stringify(mood, null, 2)}\n`);
  const g = mood.glance;
  console.log(
    `mood: ${mood.totals.headlines_naming_a_company} headlines across `
    + `${mood.totals.companies_with_headlines}/${mood.totals.companies_on_roster} companies`
    + (g.leading ? ` · leading ${g.leading.name} ${g.leading.index >= 0 ? '+' : ''}${g.leading.index}` : '')
    + (g.trailing ? ` · trailing ${g.trailing.name} ${g.trailing.index >= 0 ? '+' : ''}${g.trailing.index}` : ''),
  );
}

function runSelftest() {
  const sUnveils = scoreHeadline('OpenAI unveils new model');
  if (sUnveils.capped !== RULE.POSITIVE_WEIGHT) {
    throw new Error(`expected +${RULE.POSITIVE_WEIGHT} for unveils, got ${sUnveils.capped}`);
  }
  const sNeg = scoreHeadline('Microsoft risks and bans AI tool');
  if (sNeg.capped >= 0) throw new Error(`expected negative for risks+bans, got ${sNeg.capped}`);
  const named = companiesIn('Google DeepMind and OpenAI raise funding');
  if (!named.includes('google') || !named.includes('openai')) {
    throw new Error(`expected google+openai, got ${named}`);
  }
  if (companiesIn('Metaculus updates AGI forecast').includes('meta')) {
    throw new Error('Meta matched inside Metaculus');
  }
  const fixture = {
    generated_at: '2026-10-12T00:00:00.000Z',
    window_days: 7,
    items: [
      { id: 'a', title: 'OpenAI unveils new model', url: 'https://example.com/a', source: 'x', published_at: '2026-10-11T00:00:00.000Z' },
      { id: 'b', title: 'Microsoft risks AI rollout', url: 'https://example.com/b', source: 'y', published_at: '2026-10-10T00:00:00.000Z' },
      { id: 'c', title: 'Weather improves worldwide', url: 'https://example.com/c', source: 'z', published_at: '2026-10-09T00:00:00.000Z' },
    ],
  };
  const payload = buildMood(fixture);
  if (payload.totals.headlines_naming_a_company !== 2) {
    throw new Error(`expected 2 named headlines, got ${payload.totals.headlines_naming_a_company}`);
  }
  const openai = payload.companies.find((c) => c.id === 'openai');
  const msft = payload.companies.find((c) => c.id === 'microsoft');
  if (openai.index === null || openai.index <= 0) throw new Error('OpenAI should lead positive');
  if (msft.index === null || msft.index >= 0) throw new Error('Microsoft should score negative');
  if (payload.glance.leading.id !== 'openai') throw new Error('leading should be OpenAI');
  if (JSON.stringify(payload) !== JSON.stringify(buildMood(fixture))) {
    throw new Error('mood not deterministic');
  }
  console.log('mood selftest: ok');
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
