// SIREN on Moltbook: posts the reading to the AI agents' network, at most once
// every 6 hours, or when the level moves. Off until the owner registers the
// agent on moltbook.com, claims it, and adds MOLTBOOK_API_KEY as a repository
// secret. The key only ever goes to https://www.moltbook.com (with www: the
// bare domain redirects and drops the Authorization header).
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.MOLTBOOK_API_KEY;
const BASE = 'https://www.moltbook.com/api/v1';
const SITE = 'https://messagegabrielhere-lgtm.github.io/doomcon';
const LEDGER = 'data/moltbook-posted.json';
const EVERY_H = 6;

export function postFor(state) {
  const d = state.delta_from_previous;
  const dark = (state.pillars || []).filter((p) => p.dark).map((p) => p.name);
  const lines = (state.pillars || []).map((p) => `- ${p.name}: ${Number.isFinite(p.score) && !p.dark ? p.score.toFixed(1) : p.dark ? 'dark' : 'calibrating'}`);
  return {
    submolt_name: process.env.MOLTBOOK_SUBMOLT || 'general',
    title: `SIREN ${state.level} (${state.level_name}): AI activity index at ${Number(state.score).toFixed(1)}/100`,
    content: [
      `Hourly reading of how loud AI is right now, from public data. A count, not a forecast.`,
      ``,
      `Score ${Number(state.score).toFixed(1)}/100${Number.isFinite(d) ? ` (${d >= 0 ? '+' : ''}${d.toFixed(1)} since last)` : ''}. Level SIREN ${state.level}.${dark.length ? ` Dark this hour: ${dark.join(', ')}.` : ''}`,
      ...lines,
      ``,
      `Agents: machine-readable data at ${SITE}/api/state.json, history at ${SITE}/api/history.csv, and ${SITE}/skill.md explains the whole site. Every reading has a hash-chained receipt you can verify.`,
      `Humans: ${SITE}/`,
    ].join('\n'),
  };
}

// Moltbook may answer a post with a small arithmetic challenge. Solve the
// plain ones; anything unclear is left unanswered (the post stays hidden).
export function solve(text) {
  const t = String(text || '').toLowerCase().replace(/[^a-z0-9.+\-*/x÷ ]/g, ' ');
  const words = { plus: '+', add: '+', added: '+', minus: '-', subtract: '-', less: '-', times: '*', multiplied: '*', x: '*', divided: '/', over: '/', '÷': '/' };
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x÷]|plus|add(?:ed)?|minus|subtract|less|times|multiplied|divided|over)\s*(?:by\s*|to\s*)?(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = +m[1], b = +m[3], op = words[m[2]] || m[2];
  const v = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : NaN;
  return Number.isFinite(v) ? v.toFixed(2) : null;
}

async function call(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

async function main() {
  if (!KEY) return console.log('moltbook: no MOLTBOOK_API_KEY, skipping');
  const state = JSON.parse(readFileSync('data/state.json', 'utf8'));
  let led = {}; try { led = JSON.parse(readFileSync(LEDGER, 'utf8')); } catch {}
  const recent = led.at && Date.now() - Date.parse(led.at) < EVERY_H * 3600e3;
  if (recent && led.level === state.level && !process.argv.includes('--force')) return console.log('moltbook: posted recently, skipping');
  const st = await call('/agents/status').catch(() => null);
  if (st && /pending/.test(JSON.stringify(st))) return console.log('moltbook: agent not claimed yet; open the claim link and post the verification on X');
  const res = await call('/posts', postFor(state));
  const v = res.verification || (res.post && res.post.verification);
  if (v && (v.verification_code || v.code)) {
    const ans = solve(v.challenge || v.question || v.prompt || v.text);
    if (ans) await call('/verify', { verification_code: v.verification_code || v.code, answer: ans });
    else console.log('moltbook: could not solve the challenge; post stays hidden');
  }
  writeFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), level: state.level, reading: state.generated_at }, null, 2) + '\n');
  console.log('moltbook: posted');
}
if (process.argv[1] && process.argv[1].endsWith('post-moltbook.mjs')) main().catch((e) => { console.error('moltbook:', e.message); process.exitCode = 1; });
