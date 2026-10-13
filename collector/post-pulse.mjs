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
// System and health status never goes out. pulse, agent-watch and takeover
// share preparePulsePost(): a degraded reading, a missing or imputed pillar,
// a pillar with no frozen baseline, or a reading with no real number is
// skipped and the reason is logged. Drafts that say so are withheld too.
//
//   node collector/post-pulse.mjs pulse|agent-watch|takeover [--dry-run]
//   node collector/post-pulse.mjs --selftest
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { preflightX, postToX, printResults, readCredentials, X_TWEETS_URL } from './post-x.mjs';
import { indexReading, readingBlockReason, selfTest as xReadGuardSelfTest, xMessageBlock } from './x-read-guard.mjs';

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
  if (kind !== 'pulse' && today.some((r) => r.kind === kind)) return `${kind} already posted today`;
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

export function takeoverCandidates(state, sig) {
  if (!sig) return [];
  const at = hhmm(sig.generated_at || state.generated_at), day = String(sig.generated_at || '').slice(0, 10);
  const out = [];
  const a = sig.agent_prs, f = sig.frontier, m = sig.moltbook;
  if (a && Number.isFinite(a.total_24h)) {
    const top = (a.by_agent || []).filter((x) => Number.isFinite(x.prs_24h)).sort((x, y) => y.prs_24h - x.prs_24h)[0];
    out.push({ story: `takeover:prs:${day}`, text: `Takeover Watch, ${at}: AI coding agents opened ${a.total_24h.toLocaleString('en-US')} pull requests on GitHub from their own accounts in the last 24 hours${top ? `, ${top.name} the busiest with ${top.prs_24h.toLocaleString('en-US')}` : ''}. Software writing software, counted in public.` });
  }
  if (f && Number.isFinite(f.models_90d)) out.push({ story: `takeover:frontier:${day}`, text: `Takeover Watch, ${at}: ${f.models_90d} notable AI models shipped in the last 90 days, by Epoch AI's count${f.newest && f.newest[0] ? `. Newest: ${cleanTitle(f.newest[0].model, 40)} from ${cleanTitle(f.newest[0].org, 30)}` : ''}. SIREN ${state.level}, ${Number(state.score).toFixed(1)} of 100.` });
  if (m && Number.isFinite(m.agents_seen)) out.push({ story: `takeover:molt:${day}`, text: `Takeover Watch, ${at}: ${m.agents_seen} AI agents, ${Number(m.replies_seen || 0).toLocaleString('en-US')} agent-to-agent replies across the Moltbook threads SIREN tracks. Machines talking to machines, counted, not scored.` });
  const k = Math.floor(Date.now() / 864e5) % Math.max(1, out.length);
  return out.slice(k).concat(out.slice(0, k));
}

export function pick(cands, ledger) {
  const used = new Set(ledger.map((r) => r.story));
  for (const c of cands) {
    if (used.has(c.story)) continue;
    try { preflightX(c.text); return c; } catch { /* try the next phrasing */ }
  }
  return null;
}

/**
 * The one decision pulse, agent-watch and takeover share. Returns the draft
 * to send, or why nothing should be sent. Status drafts are listed on
 * `withheld` even when a real reading is still posted.
 */
export function preparePulsePost({ state, candidates, ledger }) {
  const readWhy = readingBlockReason(state);
  if (readWhy) return { post: null, why: readWhy, withheld: [] };
  const withheld = [];
  const allowed = [];
  for (const c of candidates || []) {
    const why = xMessageBlock(c && c.text);
    if (why) withheld.push(why);
    else allowed.push(c);
  }
  const unique = [...new Set(withheld)];
  const post = pick(allowed, ledger || []);
  if (post) return { post, why: null, withheld: unique };
  if (!allowed.length && unique.length) return { post: null, why: unique.join('; '), withheld: unique };
  return { post: null, why: 'no candidate passed the preflight', withheld: unique };
}

/**
 * Send one already-chosen pulse. readCredentials() returns { ok, creds } or
 * { ok: false, missing }; postToX wants the bare creds object. Same unwrap as
 * post-daily (channelCredentials) and dispatch/post-alerts.mjs. A missing
 * secret throws the env names and never a value. `transport` is for selfTest.
 */
export async function postPulse({ text, state, env = process.env, transport } = {}) {
  const reasons = [];
  const readWhy = readingBlockReason(state);
  if (readWhy) reasons.push(readWhy);
  const textWhy = xMessageBlock(text);
  if (textWhy) reasons.push(textWhy);
  if (reasons.length) {
    const why = reasons.join('; ');
    console.log(`pulse: skipping — ${why}`);
    return { outcome: 'skipped', why };
  }
  const auth = readCredentials(env);
  if (!auth.ok) throw new Error(`missing ${auth.missing.join(', ')}`);
  return postToX({ text, png: null, creds: auth.creds, ...(transport ? { transport } : {}) });
}

async function main(argv) {
  const kind = argv.find((a) => a === 'pulse' || a === 'agent-watch' || a === 'takeover') || 'pulse';
  const dry = argv.includes('--dry-run');
  const state = read('data/state.json');
  if (!state) throw new Error('no data/state.json');
  const ledger = readLedger();
  const cands = kind === 'agent-watch' ? agentWatchCandidates(state, read('data/moltbook.json')) : kind === 'takeover' ? takeoverCandidates(state, read('data/si-signals.json')) : pulseCandidates(state, read('data/news.json'));
  const prepared = preparePulsePost({ state, candidates: cands, ledger });
  if (!prepared.post) {
    console.log(`pulse (${kind}): skipping — ${prepared.why}`);
    return;
  }
  const whyNot = canPost(ledger, kind);
  if (whyNot && !dry) { console.log(`pulse: skipping (${whyNot})`); return; }
  if (prepared.withheld.length) console.log(`pulse (${kind}): withheld system or health status (${prepared.withheld.join('; ')})`);
  console.log(`pulse (${kind}): ${prepared.post.text}`);
  if (dry) return;
  const res = await postPulse({ text: prepared.post.text, state });
  if (!res || res.outcome === 'skipped') {
    console.log(`pulse (${kind}): skipping — ${(res && res.why) || 'not a real index read'}`);
    return;
  }
  appendFileSync(LEDGER, JSON.stringify({ schema: 1, kind, story: prepared.post.story, posted_at: new Date().toISOString(), outcome: res.outcome, post_id: res.id, text: prepared.post.text }) + '\n');
  console.log(`pulse: ${res.outcome} ${res.url || ''}`);
}

// A real pulse is chosen upstream; this only has to clear preflightX.
const FIXTURE_PULSE_TEXT = 'SIREN 4, 39.6 of 100, as of 14:07 UTC. A count of what already happened.';

export async function selfTest() {
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
  const fullEnv = {
    X_API_KEY: 'k-SENTINEL', X_API_SECRET: 's-SENTINEL', X_ACCESS_TOKEN: 't-SENTINEL', X_ACCESS_SECRET: 'ts-SENTINEL',
  };
  const healthy = indexReading();

  for (const r of xReadGuardSelfTest()) results.push(r);

  await check('postPulse names missing env vars and sends nothing', async () => {
    let n = 0;
    let message = '';
    try {
      await postPulse({
        text: FIXTURE_PULSE_TEXT,
        state: healthy,
        env: { X_API_KEY: 'k-SENTINEL', X_API_SECRET: '   ' },
        transport: async () => { n++; return { status: 201, text: '{"data":{"id":"1"}}' }; },
      });
    } catch (err) { message = err.message; }
    for (const name of ['X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']) {
      if (!message.includes(name)) throw new Error(`error did not name ${name}: ${message}`);
    }
    if (message.includes('X_API_KEY')) throw new Error(`error named a variable that was set: ${message}`);
    if (message.includes('SENTINEL')) throw new Error('error echoed a credential value');
    eq(n, 0, 'requests sent');
  });

  await check('postPulse unwraps readCredentials() and posts text only', async () => {
    const calls = [];
    const res = await postPulse({
      text: FIXTURE_PULSE_TEXT,
      state: healthy,
      env: fullEnv,
      transport: async (req) => {
        calls.push({ url: req.url, body: String(req.body), authorization: req.headers.authorization });
        return { status: 201, text: JSON.stringify({ data: { id: '1880000000000000099' } }) };
      },
    });
    // The bug passed { ok, creds } straight through. postToX then throws
    // before any request, so a transport call is the proof the unwrap happened.
    eq(calls.length, 1, 'call count');
    eq(calls[0].url, X_TWEETS_URL, 'url');
    eq(JSON.parse(calls[0].body).text, FIXTURE_PULSE_TEXT, 'text');
    if (!String(calls[0].authorization).startsWith('OAuth ')) throw new Error('request was not signed');
    eq(res.outcome, 'posted', 'outcome');
    eq(res.id, '1880000000000000099', 'id');
    const visible = `${calls[0].body} ${res.url || ''} ${res.outcome}`;
    if (visible.includes('SENTINEL')) throw new Error('a credential value leaked into the body or result');
  });

  await check('postPulse sends nothing for system or health status, or a reading that is not a real number', async () => {
    const samples = [
      { text: 'SIREN is degraded as of 14:30 UTC. 1 of 5 pillars has no frozen baseline yet: markets.', state: healthy, pattern: /degraded index notice/ },
      { text: 'Skynet status at 14:30 UTC. SIREN 4, 49.3 of 100.', state: healthy, pattern: /status wording/ },
      { text: 'Source health is healthy. SIREN 4, 49.3 of 100.', state: healthy, pattern: /health wording/ },
      { text: 'The collector returned an error.', state: healthy, pattern: /errors/ },
      { text: 'The value was imputed.', state: healthy, pattern: /imputed values/ },
      { text: FIXTURE_PULSE_TEXT, state: indexReading({ degraded: true }), pattern: /index is degraded/ },
      {
        text: FIXTURE_PULSE_TEXT,
        state: indexReading({
          uncalibrated_pillars: ['markets'],
          pillars: healthy.pillars.map((p) => (p.id === 'markets' ? { ...p, uncalibrated: true, score: null } : p)),
        }),
        pattern: /no frozen baseline/,
      },
      {
        text: FIXTURE_PULSE_TEXT,
        state: indexReading({
          dark_pillars: ['markets'],
          pillars: healthy.pillars.map((p) => (p.id === 'markets' ? { ...p, dark: true, score: null } : p)),
        }),
        pattern: /is missing/,
      },
      {
        text: FIXTURE_PULSE_TEXT,
        state: indexReading({ pillars: healthy.pillars.map((p) => (p.id === 'markets' ? { ...p, imputed: true } : p)) }),
        pattern: /imputed/,
      },
      { text: FIXTURE_PULSE_TEXT, state: indexReading({ score: null }), pattern: /no real number/ },
    ];
    for (const sample of samples) {
      let n = 0;
      const res = await postPulse({
        text: sample.text,
        state: sample.state,
        env: fullEnv,
        transport: async () => { n++; return { status: 201, text: '{"data":{"id":"1"}}' }; },
      });
      eq(n, 0, `requests for ${sample.text.slice(0, 40)}`);
      eq(res.outcome, 'skipped', 'outcome');
      if (!sample.pattern.test(res.why)) throw new Error(`expected ${sample.pattern}, got ${res.why}`);
    }
  });

  await check('passing the raw readCredentials() result into postToX sends nothing', async () => {
    const auth = readCredentials(fullEnv);
    eq(auth.ok, true, 'ok');
    let n = 0;
    let message = '';
    try {
      await postToX({
        text: FIXTURE_PULSE_TEXT,
        png: null,
        creds: auth,
        transport: async () => { n++; return { status: 201, text: '{"data":{"id":"1"}}' }; },
      });
    } catch (err) { message = err.message; }
    if (!/no credentials/.test(message)) throw new Error(`expected the credentials guard, got ${JSON.stringify(message)}`);
    if (message.includes('SENTINEL')) throw new Error('the guard echoed a credential value');
    eq(n, 0, 'requests sent');
  });

  return results;
}

async function cli(argv) {
  if (argv.includes('--selftest') || argv.includes('--test')) {
    if (!printResults('post-pulse', await selfTest())) process.exitCode = 1;
    return;
  }
  await main(argv);
}

if (process.argv[1] && process.argv[1].endsWith('post-pulse.mjs')) {
  cli(process.argv.slice(2)).catch((e) => { console.error('pulse:', e.message); console.log(`::warning title=post-pulse::${String(e.message).slice(0, 300)}`); process.exitCode = 1; });
}
