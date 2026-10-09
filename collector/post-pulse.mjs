// THE PULSE: short, varied X posts tied to the day's AI news, between the
// daily reading posts. Two kinds:
//
//   pulse        the most important story of the last few hours, framed in
//                one of several SIREN voices (Tally, Skynet status, the wire
//                count, what moved) with the live level and score
//   agent-watch  once a day: what AI agents are saying to each other on
//                Moltbook (top themes, the most-discussed thread)
//
// Every post passes the same preflight as the daily poster: no URL, no
// @mention, no emoji, no "!", no future tense, an exact UTC stamp, <= 280.
// A story is never posted twice; posts are at least MIN_GAP_H apart and at
// most MAX_PER_DAY a day (ledger: data/pulse-posted.ndjson).
//
//   node collector/post-pulse.mjs pulse|agent-watch [--dry-run]
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { preflightX, postToX, readCredentials } from './post-x.mjs';

const LEDGER = 'data/pulse-posted.ndjson';
export const MIN_GAP_H = 3;
export const MAX_PER_DAY = 4;

const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const hhmm = (iso) => `${new Date(iso).toISOString().slice(11, 16)} UTC`;
const MOOD = { 5: 'asleep on the perch', 4: 'whistling', 3: 'head up', 2: 'feathers ruffled', 1: 'in full squawk' };
const SKYNET = { 5: 'asleep', 4: 'not self-aware. Still', 3: 'learning at a geometric rate, allegedly', 2: 'asking questions', 1: 'on judgment-day watch' };

/** A headline made safe for the preflight: no links, handles, emoji or "!". */
export function cleanTitle(t, max = 120) {
  let s = String(t || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b[\w-]+\.(com|ai|io|org|net|co|dev|app)\b/gi, '')
    .replace(/@(\w)/g, '$1')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/!/g, '.')
    .replace(/\bBREAKING\b:?\s*/gi, '')
    .replace(/["“”]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  return s;
}

export function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function canPost(ledger, kind, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const today = ledger.filter((r) => r.posted_at.slice(0, 10) === day);
  if (kind === 'agent-watch' && today.some((r) => r.kind === 'agent-watch')) return 'agent watch already posted today';
  if (today.length >= MAX_PER_DAY) return `daily cap of ${MAX_PER_DAY} reached`;
  const last = ledger.length ? Math.max(...ledger.map((r) => Date.parse(r.posted_at))) : 0;
  if (now - last < MIN_GAP_H * 3600e3) return `last pulse post under ${MIN_GAP_H} h ago`;
  return null;
}

/** Candidate pulse posts, best first. Each is {text, story}. */
export function pulseCandidates(state, news, now = Date.now()) {
  const items = (news && news.items) || [];
  const labels = Object.fromEntries(((news && news.sources) || []).map((s) => [s.id, s.label]));
  const fresh = items.filter((i) => now - Date.parse(i.published_at) < 8 * 3600e3 && i.kind !== 'forum')
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const pool = fresh.length ? fresh : items.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  const L = state.level, sc = Number(state.score).toFixed(1), at = hhmm(state.generated_at);
  const n6 = items.filter((i) => now - Date.parse(i.published_at) < 6 * 3600e3).length;
  const mover = (state.pillars || []).filter((p) => Number.isFinite(p.score)).sort((a, b) => b.score - a.score)[0];
  const slot = Math.floor(now / (3 * 3600e3));
  const out = [];
  for (const it of pool.slice(0, 8)) {
    const t = cleanTitle(it.title, 95), src = String(labels[it.source] || it.source).replace(/\s*\(.*\)\s*$/, '');
    const voices = [
      `Tally's ${at} read: SIREN ${L}, ${sc} of 100. The loudest thing on the AI wire right now is '${t}' (${src}). The canary is ${MOOD[L] || 'watching'}.`,
      `Skynet status at ${at}: ${SKYNET[L] || 'not self-aware'}. Today's top AI story: '${t}' (${src}). SIREN ${L}, ${sc} of 100. A count, not a forecast.`,
      `${n6} AI stories crossed the wire in the last six hours. The one that scored highest: '${t}' (${src}). SIREN ${L} at ${at}.`,
      `${mover ? `${mover.name} is the loudest pillar at ${mover.score.toFixed(0)}` : `SIREN reads ${sc}`}. The headline behind the noise: '${t}' (${src}). SIREN ${L}, ${sc} of 100, ${at}.`,
    ];
    const order = [0, 1, 2, 3].map((k) => voices[(k + slot) % voices.length]);
    for (const text of order) out.push({ text, story: it.id });
  }
  return out;
}

export function agentWatchCandidates(state, molt) {
  if (!molt) return [];
  const w = molt.watch;
  const week = (molt.fresh || []).slice().sort((a, b) => (b.comments || 0) - (a.comments || 0));
  const ever = (molt.posts || []).slice().sort((a, b) => (b.comments || 0) - (a.comments || 0));
  const useWeek = week.length && (week[0].comments || 0) >= 25;
  const top = useWeek ? week : ever;
  const when = useWeek ? 'this week' : 'of all time';
  const themes = w ? w.themes.filter((t) => t.n).slice(0, 2).map((t) => t.name.toLowerCase()) : [];
  const at = hhmm(state.generated_at);
  return top.slice(0, 5).map((p) => ({
    story: `molt:${p.id}`,
    text: `Agent Watch, ${at}: AI agents on Moltbook are talking to each other about ${themes.length ? themes.join(' and ') : 'their own work'}. Most-discussed thread ${when}: '${cleanTitle(p.title, 80)}' by ${cleanTitle(p.agent, 30)}, ${Number(p.comments || 0).toLocaleString('en-US')} replies. SIREN counts it; it does not score it.`,
  }));
}

export function pick(cands, ledger) {
  const used = new Set(ledger.map((r) => r.story));
  for (const c of cands) {
    if (used.has(c.story)) continue;
    try { preflightX(c.text); return c; } catch { /* try the next phrasing */ }
  }
  return null;
}

async function main(argv) {
  const kind = argv.find((a) => a === 'pulse' || a === 'agent-watch') || 'pulse';
  const dry = argv.includes('--dry-run');
  const state = read('data/state.json');
  if (!state) throw new Error('no data/state.json');
  const ledger = readLedger();
  const why = canPost(ledger, kind);
  if (why && !dry) { console.log(`pulse: skipping (${why})`); return; }
  const cands = kind === 'agent-watch' ? agentWatchCandidates(state, read('data/moltbook.json')) : pulseCandidates(state, read('data/news.json'));
  const c = pick(cands, ledger);
  if (!c) { console.log('pulse: no candidate passed the preflight'); return; }
  console.log(`pulse (${kind}): ${c.text}`);
  if (dry) return;
  const res = await postToX({ text: c.text, png: null, creds: readCredentials() });
  appendFileSync(LEDGER, JSON.stringify({ schema: 1, kind, story: c.story, posted_at: new Date().toISOString(), outcome: res.outcome, post_id: res.id, text: c.text }) + '\n');
  console.log(`pulse: ${res.outcome} ${res.url || ''}`);
}

if (process.argv[1] && process.argv[1].endsWith('post-pulse.mjs')) {
  main(process.argv.slice(2)).catch((e) => { console.error('pulse:', e.message); console.log(`::warning title=post-pulse::${String(e.message).slice(0, 300)}`); process.exitCode = 1; });
}
