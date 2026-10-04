// TALLY'S BETS. The index does not forecast and never will. This is a separate
// ledger of small, dated, checkable forecasts ABOUT the index, each with a
// stated probability, made once a day and scored in public when it falls due.
//
//   node collector/bets.mjs          # reads data/history.ndjson, updates data/bets.json
//
// WHY IT IS ALLOWED TO EXIST. The site's rule against prediction is a rule
// against unaccountable ones. A forecast with a probability, a due date and a
// published score is the opposite: it can be wrong in public, and the running
// Brier score says how wrong. Nobody's judgement sets the probability either.
// Every figure is a BASE RATE from the index's own history with Laplace
// smoothing, (k + 1) / (n + 2), so the method is a formula and the page shows
// k and n beside each number.
//
// WHAT IT NEVER DOES. It does not feed the index, it is not posted by the
// publisher, and it makes no statement about the world outside the index.
//
// Deterministic: "now" is the timestamp of the newest reading, never the
// clock, so the same history always produces the same file.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HISTORY = path.join(ROOT, 'data', 'history.ndjson');
const OUT = path.join(ROOT, 'data', 'bets.json');
const H = 3600 * 1000;
const MIN_PAIRS = 20;

export function parseHistory(text) {
  return String(text).split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => Number.isFinite(Date.parse(r.t)) && Number.isFinite(r.score) && Number.isFinite(r.level))
    .map((r) => ({ t: Date.parse(r.t), iso: r.t, score: r.score, level: r.level }))
    .sort((a, b) => a.t - b.t);
}

const laplace = (k, n) => Math.round(((k + 1) / (n + 2)) * 1000) / 1000;
const firstAtOrAfter = (rows, t) => rows.find((r) => r.t >= t) || null;

/** Base rates over every reading old enough to have an outcome. */
export function baseRates(rows) {
  const end = rows.length ? rows[rows.length - 1].t : 0;
  const acc = { same24: [0, 0], higher24: [0, 0], change7: [0, 0] };
  for (const r of rows) {
    if (r.t + 24 * H <= end) {
      const j = firstAtOrAfter(rows, r.t + 24 * H);
      acc.same24[1] += 1; if (j.level === r.level) acc.same24[0] += 1;
      acc.higher24[1] += 1; if (j.score > r.score) acc.higher24[0] += 1;
    }
    if (r.t + 168 * H <= end) {
      const win = rows.filter((x) => x.t > r.t && x.t <= r.t + 168 * H);
      acc.change7[1] += 1; if (win.some((x) => x.level !== r.level)) acc.change7[0] += 1;
    }
  }
  return acc;
}

function outcome(bet, rows) {
  const made = Date.parse(bet.made_at); const due = Date.parse(bet.due_at);
  if (bet.kind === 'change-7d') {
    const win = rows.filter((x) => x.t > made && x.t <= due);
    const j = firstAtOrAfter(rows, due);
    if (!j) return null;
    return { hit: win.some((x) => x.level !== bet.ref.level), at: j.iso };
  }
  const j = firstAtOrAfter(rows, due);
  if (!j) return null;
  if (bet.kind === 'same-level-24h') return { hit: j.level === bet.ref.level, at: j.iso, seen: { level: j.level, score: j.score } };
  if (bet.kind === 'higher-24h') return { hit: j.score > bet.ref.score, at: j.iso, seen: { level: j.level, score: j.score } };
  return null;
}

export function update(prev, rows) {
  const book = { schema: 1, open: [...(prev.open || [])], resolved: [...(prev.resolved || [])] };
  if (!rows.length) return { ...book, generated_at: null, summary: summarise(book.resolved) };
  const now = rows[rows.length - 1];

  // Settle what has fallen due.
  const still = [];
  for (const b of book.open) {
    const o = Date.parse(b.due_at) <= now.t ? outcome(b, rows) : null;
    if (!o) { still.push(b); continue; }
    const y = o.hit ? 1 : 0;
    book.resolved.push({ ...b, resolved_at: o.at, hit: o.hit, seen: o.seen || null, brier: Math.round((b.p - y) ** 2 * 10000) / 10000 });
  }
  book.open = still;

  // One set of bets per UTC day, made at the first reading of that day we see.
  const day = now.iso.slice(0, 10);
  const made = [...book.open, ...book.resolved].some((b) => b.made_on === day);
  if (!made) {
    const br = baseRates(rows);
    const mk = (kind, hours, statement, [k, n]) => (n >= MIN_PAIRS ? {
      id: `${day}-${kind}`, kind, made_on: day, made_at: now.iso,
      due_at: new Date(now.t + hours * H).toISOString(),
      statement, p: laplace(k, n), basis: { k, n, method: 'base rate over the index history, Laplace-smoothed' },
      ref: { level: now.level, score: now.score },
    } : null);
    book.open.push(...[
      mk('same-level-24h', 24, `The level is still ${now.level} at the first reading 24 hours on.`, br.same24),
      mk('higher-24h', 24, `The composite is above ${now.score.toFixed(1)} at the first reading 24 hours on.`, br.higher24),
      mk('change-7d', 168, `The level moves off ${now.level} at least once in the next 7 days.`, br.change7),
    ].filter(Boolean));
  }
  book.resolved.sort((a, b) => (a.resolved_at < b.resolved_at ? 1 : -1));
  return { ...book, generated_at: now.iso, summary: summarise(book.resolved) };
}

function summarise(resolved) {
  const n = resolved.length;
  if (!n) return { resolved: 0, hits: 0, mean_brier: null, coin_flip_brier: 0.25 };
  const hits = resolved.filter((b) => b.hit).length;
  const mean = resolved.reduce((a, b) => a + b.brier, 0) / n;
  return { resolved: n, hits, mean_brier: Math.round(mean * 10000) / 10000, coin_flip_brier: 0.25 };
}

async function main() {
  const rows = parseHistory(await readFile(HISTORY, 'utf8'));
  let prev = {};
  try { prev = JSON.parse(await readFile(OUT, 'utf8')); } catch { prev = {}; }
  const next = update(prev, rows);
  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n');
  console.log(`[bets] ${next.open.length} open, ${next.summary.resolved} resolved${next.summary.mean_brier === null ? '' : `, mean Brier ${next.summary.mean_brier}`}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(`[bets] ${err.stack ?? err}`); process.exitCode = 1; });
}
